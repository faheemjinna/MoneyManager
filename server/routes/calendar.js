import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { CalendarConnection } from "../models/CalendarConnection.js";
import {
  exchangeGoogleCode,
  googleCalendarConfigured,
  googleCalendarScopes,
  googleUserInfo,
  syncAllGoogleConnections,
  upsertGoogleConnection,
} from "../services/googleCalendar.js";

const router = Router();

function publicConnection(connection) {
  return {
    id: String(connection._id),
    provider: connection.provider,
    email: connection.email,
    name: connection.name,
    status: connection.status,
    calendars: connection.calendars,
    lastSyncedAt: connection.lastSyncedAt,
  };
}

function popupResponse({ ok, message }) {
  const payload = JSON.stringify({ type: "calendar-google-callback", ok, message });
  return `<!doctype html>
<html>
  <body>
    <script>
      if (window.opener) window.opener.postMessage(${payload}, "*");
      window.close();
    </script>
    <p>${message}</p>
  </body>
</html>`;
}

router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const connections = await CalendarConnection.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({
      googleConfigured: googleCalendarConfigured(env),
      accounts: connections.map(publicConnection),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/google/auth-url", requireAuth, (req, res) => {
  if (!googleCalendarConfigured(env)) return res.status(501).json({ message: "Google Calendar is not configured on this server." });
  const state = jwt.sign({ sub: req.user.id, purpose: "google-calendar", nonce: crypto.randomBytes(16).toString("hex") }, env.jwtSecret, { expiresIn: "10m" });
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: "code",
    scope: googleCalendarScopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

router.get("/google/callback", async (req, res, next) => {
  try {
    if (!googleCalendarConfigured(env)) {
      return res.status(501).send(popupResponse({ ok: false, message: "Google Calendar is not configured." }));
    }
    if (req.query.error) {
      return res.status(400).send(popupResponse({ ok: false, message: String(req.query.error) }));
    }
    const payload = jwt.verify(String(req.query.state ?? ""), env.jwtSecret);
    if (payload.purpose !== "google-calendar") {
      return res.status(400).send(popupResponse({ ok: false, message: "Invalid Google Calendar login state." }));
    }

    const token = await exchangeGoogleCode(env, String(req.query.code ?? ""));
    const profile = await googleUserInfo(token.access_token);
    await upsertGoogleConnection({ env, userId: payload.sub, token, profile });
    res.send(popupResponse({ ok: true, message: "Google Calendar connected. You can close this window." }));
  } catch (error) {
    console.error(error);
    res.status(500).send(popupResponse({ ok: false, message: error.message || "Google Calendar connection failed." }));
  }
});

router.post("/sync", requireAuth, async (req, res, next) => {
  try {
    if (!googleCalendarConfigured(env)) return res.status(501).json({ message: "Google Calendar is not configured on this server." });
    const result = await syncAllGoogleConnections(env, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
