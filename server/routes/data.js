import { Router } from "express";
import { z } from "zod";
import { Account } from "../models/Account.js";
import { Budget } from "../models/Budget.js";
import { Card } from "../models/Card.js";
import { Institution } from "../models/Institution.js";
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

router.get("/", async (req, res, next) => {
  try {
    const [accounts, cards, transactions, budgets] = await Promise.all([
      Account.find({ userId: req.user.id }).sort({ createdAt: -1 }),
      Card.find({ userId: req.user.id }).sort({ createdAt: -1 }),
      Transaction.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 }).limit(1000),
      Budget.find({ userId: req.user.id }).sort({ category: 1 }),
    ]);
    res.json({
      accounts: accounts.map(accountDto),
      cards: cards.map(cardDto),
      transactions: transactions.map(transactionDto),
      budgets: budgets.map(toId),
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

router.delete("/:collection/:id", async (req, res, next) => {
  try {
    const models = { accounts: Account, cards: Card, transactions: Transaction, budgets: Budget };
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
      Institution.deleteMany({ userId: req.user.id }),
    ]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
