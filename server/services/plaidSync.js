import { Account } from "../models/Account.js";
import { Card } from "../models/Card.js";
import { Institution } from "../models/Institution.js";
import { Transaction } from "../models/Transaction.js";
import { decryptString } from "../utils/crypto.js";
import { plaidClient } from "./plaid.js";

function accountType(plaidAccount) {
  if (plaidAccount.type === "investment") return "Investment";
  if (plaidAccount.subtype === "savings") return "Savings";
  if (plaidAccount.subtype === "money market") return "Money Market";
  if (plaidAccount.type === "depository") return "Checking";
  return "Cash";
}

function categoryName(transaction) {
  return transaction.personal_finance_category?.primary?.replaceAll("_", " ") ?? transaction.category?.[0] ?? "Other";
}

export async function syncInstitution(institution, userId) {
  const client = plaidClient();
  let access_token;
  try {
    access_token = decryptString(institution.accessTokenEncrypted);
  } catch (error) {
    institution.status = "needs_reauth";
    await institution.save();
    throw new Error(`Could not decrypt Plaid token for ${institution.name}. Reconnect this institution.`);
  }
  const accountsResponse = await client.accountsGet({ access_token });
  const accountIdMap = new Map();

  for (const plaidAccount of accountsResponse.data.accounts) {
    const isCredit = plaidAccount.type === "credit";
    const common = {
      userId,
      institutionRef: institution._id,
      source: "plaid",
      providerAccountId: plaidAccount.account_id,
      last4: plaidAccount.mask ?? "",
    };

    if (isCredit) {
      const card = await Card.findOneAndUpdate(
        { userId, providerAccountId: plaidAccount.account_id },
        {
          ...common,
          nickname: plaidAccount.name,
          issuerId: institution.institutionId || "chase",
          network: plaidAccount.subtype ?? "Credit",
          creditLimit: plaidAccount.balances.limit ?? 0,
          currentDebt: Math.max(0, plaidAccount.balances.current ?? 0),
          startingDebt: Math.max(0, plaidAccount.balances.current ?? 0),
          availableCredit: plaidAccount.balances.available ?? null,
          accent: "#111827",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      accountIdMap.set(plaidAccount.account_id, { kind: "card", id: String(card._id) });
    } else {
      const account = await Account.findOneAndUpdate(
        { userId, providerAccountId: plaidAccount.account_id },
        {
          ...common,
          name: plaidAccount.name,
          bankId: institution.institutionId || "chase",
          type: accountType(plaidAccount),
          subtype: plaidAccount.subtype ?? "",
          openingBalance: plaidAccount.balances.current ?? 0,
          currentBalance: plaidAccount.balances.current ?? 0,
          availableBalance: plaidAccount.balances.available ?? null,
          currencyCode: plaidAccount.balances.iso_currency_code ?? "USD",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      accountIdMap.set(plaidAccount.account_id, { kind: "account", id: String(account._id) });
    }
  }

  let cursor = institution.syncCursor ?? undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await client.transactionsSync({ access_token, cursor, count: 250 });
    const { added, modified, removed, next_cursor, has_more } = response.data;

    for (const transaction of [...added, ...modified]) {
      const source = accountIdMap.get(transaction.account_id);
      if (!source) continue;
      const amount = Math.abs(transaction.amount);
      const isIncome = transaction.amount < 0;
      await Transaction.findOneAndUpdate(
        { userId, providerTransactionId: transaction.transaction_id },
        {
          userId,
          institutionRef: institution._id,
          providerTransactionId: transaction.transaction_id,
          type: isIncome ? "income" : "expense",
          date: transaction.date,
          merchant: transaction.merchant_name || transaction.name || "Transaction",
          category: isIncome ? "Income" : categoryName(transaction),
          amount,
          sourceKind: source.kind,
          sourceId: source.id,
          cashback: 0,
          notes: "",
          pending: transaction.pending,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    for (const transaction of removed) {
      await Transaction.deleteOne({ userId, providerTransactionId: transaction.transaction_id });
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  institution.syncCursor = cursor ?? institution.syncCursor;
  institution.lastSyncedAt = new Date();
  await institution.save();
}

export async function syncAllInstitutions(userId) {
  const institutions = await Institution.find({ userId, status: "active" });
  for (const institution of institutions) {
    try {
      await syncInstitution(institution, userId);
    } catch (error) {
      if (!String(error?.message ?? "").startsWith("Could not decrypt Plaid token")) {
        throw error;
      }
    }
  }
}
