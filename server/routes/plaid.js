import { Router } from "express";
import { z } from "zod";
import { Institution } from "../models/Institution.js";
import { encryptString } from "../utils/crypto.js";
import { plaidClient, plaidConfigured, plaidDefaults } from "../services/plaid.js";
import { syncAllInstitutions, syncInstitution } from "../services/plaidSync.js";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({
    configured: plaidConfigured(),
    environment: process.env.PLAID_ENV ?? "sandbox",
  });
});

router.post("/link-token", async (req, res, next) => {
  try {
    if (!plaidConfigured()) return res.status(501).json({ message: "Plaid is not configured on this server." });
    const client = plaidClient();
    const response = await client.linkTokenCreate({
      ...plaidDefaults,
      user: { client_user_id: req.user.id },
    });
    res.json({ linkToken: response.data.link_token });
  } catch (error) {
    next(error);
  }
});

router.post("/exchange-public-token", async (req, res, next) => {
  try {
    if (!plaidConfigured()) return res.status(501).json({ message: "Plaid is not configured on this server." });
    const { publicToken, metadata } = z
      .object({ publicToken: z.string().min(1), metadata: z.record(z.unknown()).optional() })
      .parse(req.body);
    const client = plaidClient();
    const exchange = await client.itemPublicTokenExchange({ public_token: publicToken });
    const institution = await Institution.findOneAndUpdate(
      { userId: req.user.id, itemId: exchange.data.item_id },
      {
        userId: req.user.id,
        provider: "plaid",
        itemId: exchange.data.item_id,
        institutionId: metadata?.institution?.institution_id ?? "",
        name: metadata?.institution?.name ?? "Connected institution",
        accessTokenEncrypted: encryptString(exchange.data.access_token),
        status: "active",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await syncInstitution(institution, req.user.id);
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/sync", async (req, res, next) => {
  try {
    if (!plaidConfigured()) return res.status(501).json({ message: "Plaid is not configured on this server." });
    await syncAllInstitutions(req.user.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
