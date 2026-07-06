import { Router } from "express";
import { z } from "zod";
import { Account } from "../models/Account.js";
import { Budget } from "../models/Budget.js";
import { CalendarConnection } from "../models/CalendarConnection.js";
import { CalendarEvent } from "../models/CalendarEvent.js";
import { Card } from "../models/Card.js";
import { Institution } from "../models/Institution.js";
import { Note } from "../models/Note.js";
import { Task } from "../models/Task.js";
import { Transaction } from "../models/Transaction.js";
import { accountDto, cardDto, toId, transactionDto } from "../services/serializers.js";

const router = Router();

const accountSchema = z.object({
  name: z.string().min(1).max(160),
  bankId: z.string().max(80),
  type: z.enum(["Checking", "Savings", "Money Market", "Cash", "Investment"]),
  last4: z.string().max(4).default(""),
  openingBalance: z.number().default(0),
  color: z.string().max(32).default("#0a84ff"),
});

const cardSchema = z.object({
  nickname: z.string().min(1).max(160),
  templateId: z.string().max(120).default("custom"),
  issuerId: z.string().max(80),
  network: z.string().max(80),
  last4: z.string().max(4).default(""),
  creditLimit: z.number().default(0),
  startingDebt: z.number().default(0),
  apr: z.number().default(0),
  minimumPayment: z.number().default(0),
  dueDay: z.number().int().min(1).max(28).default(1),
  statementDay: z.number().int().min(1).max(28).default(1),
  accent: z.string().max(32).default("#111827"),
  rewards: z.array(z.object({ category: z.string(), rate: z.number(), cap: z.string().optional(), note: z.string().optional() })).default([]),
});

const transactionSchema = z.object({
  type: z.enum(["expense", "income", "card-payment"]),
  date: z.string().min(8).max(12),
  merchant: z.string().min(1).max(200),
  category: z.string().max(120).default("Other"),
  amount: z.number().positive(),
  sourceKind: z.enum(["account", "card"]),
  sourceId: z.string().min(1),
  paymentAccountId: z.string().optional(),
  cashback: z.number().default(0),
  notes: z.string().max(1000).default(""),
});

const budgetSchema = z.object({
  category: z.string().min(1).max(120),
  monthlyLimit: z.number().min(0),
});

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(4000).default(""),
  dueDate: z.string().max(20).default(""),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["todo", "doing", "done"]).default("todo"),
  list: z.string().max(80).default("Personal"),
});

const calendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  start: z.string().min(8).max(40),
  end: z.string().max(40).default(""),
  location: z.string().max(240).default(""),
  meetingLink: z.string().max(500).default(""),
  attendees: z.array(z.string().email()).max(80).default([]),
  sourceEmail: z.string().max(8000).default(""),
  provider: z.string().max(80).default(""),
  providerEventId: z.string().max(300).default(""),
  notes: z.string().max(4000).default(""),
  color: z.string().max(32).default("#0a84ff"),
});

const calendarImportSchema = z
  .object({
    accountEmail: z.string().email(),
    feedUrl: z.string().url().optional().or(z.literal("")),
    icsText: z.string().max(5_000_000).optional().or(z.literal("")),
  })
  .refine((input) => Boolean(input.feedUrl || input.icsText), { message: "Paste a calendar feed URL or upload an .ics file." });

const noteSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(50000).default(""),
  tags: z.array(z.string().max(40)).max(20).default([]),
  pinned: z.boolean().default(false),
});

function unfoldIcsLines(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").reduce((lines, line) => {
    if (/^[ \t]/.test(line) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
    return lines;
  }, []);
}

function splitIcsLine(line) {
  const index = line.indexOf(":");
  if (index === -1) return null;
  const rawName = line.slice(0, index);
  const nameParts = rawName.split(";");
  const params = {};
  for (const part of nameParts.slice(1)) {
    const [key, value = ""] = part.split("=");
    params[key.toUpperCase()] = value.replace(/^"|"$/g, "");
  }
  return { name: nameParts[0].toUpperCase(), params, value: line.slice(index + 1) };
}

function decodeIcsText(value = "") {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function parseIcsDate(value = "", params = {}) {
  if (!value) return "";
  if (params.VALUE === "DATE" || /^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) return value;
  const [, year, month, day, hour, minute, second = "00", utc] = match;
  if (utc) {
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
  }
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function pickEventUrl(event) {
  const description = event.DESCRIPTION?.[0]?.value ?? "";
  const url = event.URL?.[0]?.value || description.match(/https?:\/\/\S+/i)?.[0] || "";
  return decodeIcsText(url).replace(/[),.]+$/, "");
}

function parseIcsEvents(text, accountEmail) {
  const lines = unfoldIcsLines(text);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const parsed = splitIcsLine(line);
    if (!parsed) continue;
    current[parsed.name] = [...(current[parsed.name] ?? []), parsed];
  }

  return events
    .map((event) => {
      const start = event.DTSTART?.[0];
      const end = event.DTEND?.[0];
      const attendees = (event.ATTENDEE ?? [])
        .map((attendee) => attendee.params.CN || attendee.value.replace(/^mailto:/i, ""))
        .map((value) => value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase())
        .filter(Boolean);
      const providerEventId = decodeIcsText(event.UID?.[0]?.value ?? "");
      const title = decodeIcsText(event.SUMMARY?.[0]?.value ?? "Imported event").slice(0, 200);
      return {
        title,
        start: parseIcsDate(start?.value, start?.params),
        end: parseIcsDate(end?.value, end?.params),
        location: decodeIcsText(event.LOCATION?.[0]?.value ?? "").slice(0, 240),
        meetingLink: pickEventUrl(event).slice(0, 500),
        attendees: [...new Set(attendees)].slice(0, 80),
        sourceEmail: accountEmail,
        provider: "ics",
        providerEventId: providerEventId || `${accountEmail}:${title}:${parseIcsDate(start?.value, start?.params)}`,
        notes: decodeIcsText(event.DESCRIPTION?.[0]?.value ?? "").slice(0, 4000),
        color: "#0a84ff",
      };
    })
    .filter((event) => event.title && event.start);
}

async function fetchCalendarFeed(feedUrl) {
  const parsed = new URL(feedUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Calendar feed URL must start with http or https.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(feedUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`Calendar feed returned ${response.status}.`);
    const text = await response.text();
    if (text.length > 5_000_000) throw new Error("Calendar feed is too large to import.");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

router.get("/", async (req, res, next) => {
  try {
    const [accounts, cards, transactions, budgets, tasks, calendarEvents, notes] = await Promise.all([
      Account.find({ userId: req.user.id }).sort({ createdAt: -1 }),
      Card.find({ userId: req.user.id }).sort({ createdAt: -1 }),
      Transaction.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 }).limit(1000),
      Budget.find({ userId: req.user.id }).sort({ category: 1 }),
      Task.find({ userId: req.user.id }).sort({ status: 1, dueDate: 1, createdAt: -1 }),
      CalendarEvent.find({ userId: req.user.id }).sort({ start: 1 }),
      Note.find({ userId: req.user.id }).sort({ pinned: -1, updatedAt: -1 }),
    ]);
    res.json({
      accounts: accounts.map(accountDto),
      cards: cards.map(cardDto),
      transactions: transactions.map(transactionDto),
      budgets: budgets.map(toId),
      tasks: tasks.map(toId),
      calendarEvents: calendarEvents.map(toId),
      notes: notes.map(toId),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/accounts", async (req, res, next) => {
  try {
    const input = accountSchema.parse(req.body);
    const account = await Account.create({ ...input, userId: req.user.id, currentBalance: input.openingBalance });
    res.status(201).json(accountDto(account));
  } catch (error) {
    next(error);
  }
});

router.post("/cards", async (req, res, next) => {
  try {
    const input = cardSchema.parse(req.body);
    const card = await Card.create({ ...input, userId: req.user.id, currentDebt: input.startingDebt });
    res.status(201).json(cardDto(card));
  } catch (error) {
    next(error);
  }
});

router.post("/transactions", async (req, res, next) => {
  try {
    const input = transactionSchema.parse(req.body);
    const transaction = await Transaction.create({ ...input, userId: req.user.id });
    res.status(201).json(transactionDto(transaction));
  } catch (error) {
    next(error);
  }
});

router.post("/budgets", async (req, res, next) => {
  try {
    const input = budgetSchema.parse(req.body);
    const budget = await Budget.findOneAndUpdate({ userId: req.user.id, category: input.category }, { ...input, userId: req.user.id }, { upsert: true, new: true });
    res.status(201).json(toId(budget));
  } catch (error) {
    next(error);
  }
});

router.post("/tasks", async (req, res, next) => {
  try {
    const input = taskSchema.parse(req.body);
    const task = await Task.create({ ...input, userId: req.user.id });
    res.status(201).json(toId(task));
  } catch (error) {
    next(error);
  }
});

router.post("/calendar-events", async (req, res, next) => {
  try {
    const input = calendarEventSchema.parse(req.body);
    const event = await CalendarEvent.create({ ...input, userId: req.user.id });
    res.status(201).json(toId(event));
  } catch (error) {
    next(error);
  }
});

router.post("/calendar-events/import", async (req, res, next) => {
  try {
    const input = calendarImportSchema.parse(req.body);
    const accountEmail = input.accountEmail.toLowerCase();
    const icsText = input.icsText || (await fetchCalendarFeed(input.feedUrl));
    const events = parseIcsEvents(icsText, accountEmail);
    if (!events.length) return res.status(400).json({ message: "No calendar events were found in that import." });

    let created = 0;
    let updated = 0;
    const imported = [];

    for (const event of events) {
      const existing = await CalendarEvent.findOne({ userId: req.user.id, provider: event.provider, providerEventId: event.providerEventId });
      if (existing) {
        Object.assign(existing, event);
        await existing.save();
        updated += 1;
        imported.push(toId(existing));
      } else {
        const createdEvent = await CalendarEvent.create({ ...event, userId: req.user.id });
        created += 1;
        imported.push(toId(createdEvent));
      }
    }

    res.status(201).json({ created, updated, total: imported.length, events: imported });
  } catch (error) {
    next(error);
  }
});

router.post("/notes", async (req, res, next) => {
  try {
    const input = noteSchema.parse(req.body);
    const note = await Note.create({ ...input, userId: req.user.id });
    res.status(201).json(toId(note));
  } catch (error) {
    next(error);
  }
});

router.put("/accounts/:id", async (req, res, next) => {
  try {
    const input = accountSchema.extend({ currentBalance: z.number().optional() }).parse(req.body);
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...input, currentBalance: input.currentBalance ?? input.openingBalance },
      { new: true }
    );
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(accountDto(account));
  } catch (error) {
    next(error);
  }
});

router.put("/cards/:id", async (req, res, next) => {
  try {
    const input = cardSchema.extend({ currentDebt: z.number().optional(), availableCredit: z.number().nullable().optional() }).parse(req.body);
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...input, currentDebt: input.currentDebt ?? input.startingDebt },
      { new: true }
    );
    if (!card) return res.status(404).json({ message: "Card not found" });
    res.json(cardDto(card));
  } catch (error) {
    next(error);
  }
});

router.put("/transactions/:id", async (req, res, next) => {
  try {
    const input = transactionSchema.parse(req.body);
    const transaction = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, input, { new: true });
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    res.json(transactionDto(transaction));
  } catch (error) {
    next(error);
  }
});

router.put("/budgets/:id", async (req, res, next) => {
  try {
    const input = budgetSchema.parse(req.body);
    const budget = await Budget.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, input, { new: true });
    if (!budget) return res.status(404).json({ message: "Budget not found" });
    res.json(toId(budget));
  } catch (error) {
    next(error);
  }
});

router.put("/tasks/:id", async (req, res, next) => {
  try {
    const input = taskSchema.parse(req.body);
    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, input, { new: true });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(toId(task));
  } catch (error) {
    next(error);
  }
});

router.put("/calendar-events/:id", async (req, res, next) => {
  try {
    const input = calendarEventSchema.parse(req.body);
    const event = await CalendarEvent.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, input, { new: true });
    if (!event) return res.status(404).json({ message: "Calendar event not found" });
    res.json(toId(event));
  } catch (error) {
    next(error);
  }
});

router.put("/notes/:id", async (req, res, next) => {
  try {
    const input = noteSchema.parse(req.body);
    const note = await Note.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, input, { new: true });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(toId(note));
  } catch (error) {
    next(error);
  }
});

router.delete("/:collection/:id", async (req, res, next) => {
  try {
    const models = { accounts: Account, cards: Card, transactions: Transaction, budgets: Budget, tasks: Task, "calendar-events": CalendarEvent, notes: Note };
    const Model = models[req.params.collection];
    if (!Model) return res.status(404).json({ message: "Unknown collection" });
    await Model.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post("/reset", async (req, res, next) => {
  try {
    await Promise.all([
      Account.deleteMany({ userId: req.user.id }),
      Card.deleteMany({ userId: req.user.id }),
      Transaction.deleteMany({ userId: req.user.id }),
      Budget.deleteMany({ userId: req.user.id }),
      Task.deleteMany({ userId: req.user.id }),
      CalendarEvent.deleteMany({ userId: req.user.id }),
      CalendarConnection.deleteMany({ userId: req.user.id }),
      Note.deleteMany({ userId: req.user.id }),
      Institution.deleteMany({ userId: req.user.id }),
    ]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
