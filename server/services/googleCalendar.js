import { CalendarConnection } from "../models/CalendarConnection.js";
import { CalendarEvent } from "../models/CalendarEvent.js";
import { decryptString, encryptString } from "../utils/crypto.js";
import { toId } from "./serializers.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export const googleCalendarScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
];

export function googleCalendarConfigured(env) {
  return Boolean(env.googleClientId && env.googleClientSecret && env.googleRedirectUri);
}

async function googleFetch(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error?.message || payload.error || `Google Calendar request failed with ${response.status}.`);
  }
  return payload;
}

export async function exchangeGoogleCode(env, code) {
  const body = new URLSearchParams({
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: env.googleRedirectUri,
    grant_type: "authorization_code",
  });
  return googleFetch(GOOGLE_TOKEN_URL, { method: "POST", body });
}

async function refreshGoogleAccessToken(env, connection) {
  if (!connection.refreshTokenEncrypted) {
    connection.status = "needs_reauth";
    await connection.save();
    throw new Error("Google Calendar needs to be reconnected.");
  }

  const refreshToken = decryptString(connection.refreshTokenEncrypted);
  const body = new URLSearchParams({
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const token = await googleFetch(GOOGLE_TOKEN_URL, { method: "POST", body });
  connection.accessTokenEncrypted = encryptString(token.access_token);
  connection.expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;
  connection.status = "active";
  await connection.save();
  return token.access_token;
}

export async function googleAccessToken(env, connection) {
  const expiresAt = connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0;
  if (!expiresAt || expiresAt < Date.now() + 60_000) {
    return refreshGoogleAccessToken(env, connection);
  }
  return decryptString(connection.accessTokenEncrypted);
}

export async function googleUserInfo(accessToken) {
  return googleFetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
}

async function listGoogleCalendars(accessToken) {
  const calendars = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ minAccessRole: "reader" });
    if (pageToken) params.set("pageToken", pageToken);
    const payload = await googleFetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    calendars.push(...(payload.items ?? []));
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return calendars.map((calendar) => ({
    id: calendar.id,
    summary: calendar.summaryOverride || calendar.summary || "Calendar",
    primary: Boolean(calendar.primary),
    selected: calendar.selected !== false,
    backgroundColor: calendar.backgroundColor || "#0a84ff",
  }));
}

async function updateGoogleConnectionCalendars(accessToken, connection) {
  const calendars = await listGoogleCalendars(accessToken);
  connection.calendars = calendars;
  connection.status = "active";
  await connection.save();
  return calendars;
}

function googleEventTime(value = {}) {
  if (value.dateTime) return value.dateTime;
  if (value.date) return value.date;
  return "";
}

function normalizeGoogleEvent(event, connection, calendar) {
  const start = googleEventTime(event.start);
  if (!start) return null;
  const attendees = (event.attendees ?? [])
    .map((attendee) => attendee.email?.toLowerCase())
    .filter(Boolean)
    .slice(0, 80);

  return {
    userId: connection.userId,
    title: (event.summary || "(No title)").slice(0, 200),
    start,
    end: googleEventTime(event.end),
    location: (event.location || "").slice(0, 240),
    meetingLink: (event.hangoutLink || event.conferenceData?.entryPoints?.find((entry) => entry.uri)?.uri || event.htmlLink || "").slice(0, 500),
    attendees: [...new Set(attendees)],
    sourceEmail: connection.email,
    provider: "google",
    providerEventId: `${connection._id}:${calendar.id}:${event.id}`.slice(0, 300),
    notes: (event.description || "").slice(0, 4000),
    color: calendar.backgroundColor || "#0a84ff",
  };
}

async function listGoogleEvents(accessToken, calendar) {
  const events = [];
  let pageToken = "";
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setFullYear(now.getFullYear() - 1);
  const timeMax = new Date(now);
  timeMax.setFullYear(now.getFullYear() + 2);
  do {
    const params = new URLSearchParams({
      singleEvents: "true",
      showDeleted: "false",
      orderBy: "startTime",
      maxResults: "2500",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });
    if (pageToken) params.set("pageToken", pageToken);
    const payload = await googleFetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendar.id)}/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    events.push(...(payload.items ?? []));
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);
  return events;
}

export async function upsertGoogleConnection({ env, userId, token, profile }) {
  const existing = await CalendarConnection.findOne({ userId, provider: "google", providerAccountId: profile.id });
  const refreshTokenEncrypted = token.refresh_token ? encryptString(token.refresh_token) : existing?.refreshTokenEncrypted ?? "";
  const connection = await CalendarConnection.findOneAndUpdate(
    { userId, provider: "google", providerAccountId: profile.id },
    {
      userId,
      provider: "google",
      providerAccountId: profile.id,
      email: profile.email,
      name: profile.name ?? "",
      accessTokenEncrypted: encryptString(token.access_token),
      refreshTokenEncrypted,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      status: "active",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await updateGoogleConnectionCalendars(token.access_token, connection);
  return connection;
}

export async function syncGoogleConnection(env, connection) {
  const accessToken = await googleAccessToken(env, connection);
  const calendars = await updateGoogleConnectionCalendars(accessToken, connection);

  const imported = [];
  let created = 0;
  let updated = 0;

  for (const calendar of calendars.filter((item) => item.selected)) {
    const googleEvents = await listGoogleEvents(accessToken, calendar);
    for (const googleEvent of googleEvents) {
      const event = normalizeGoogleEvent(googleEvent, connection, calendar);
      if (!event) continue;
      const existing = await CalendarEvent.findOne({ userId: connection.userId, provider: "google", providerEventId: event.providerEventId });
      if (existing) {
        Object.assign(existing, event);
        await existing.save();
        updated += 1;
        imported.push(toId(existing));
      } else {
        const createdEvent = await CalendarEvent.create(event);
        created += 1;
        imported.push(toId(createdEvent));
      }
    }
  }

  connection.lastSyncedAt = new Date();
  connection.status = "active";
  await connection.save();
  return { created, updated, total: imported.length, events: imported };
}

export async function syncAllGoogleConnections(env, userId) {
  const connections = await CalendarConnection.find({ userId, provider: "google", status: { $ne: "needs_reauth" } });
  const summary = { created: 0, updated: 0, total: 0, events: [] };
  for (const connection of connections) {
    const result = await syncGoogleConnection(env, connection);
    summary.created += result.created;
    summary.updated += result.updated;
    summary.total += result.total;
    summary.events.push(...result.events);
  }
  return summary;
}
