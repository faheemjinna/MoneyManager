import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from "plaid";
import { env } from "../config/env.js";

export function plaidConfigured() {
  return Boolean(env.plaidClientId && env.plaidSecret);
}

export function plaidClient() {
  if (!plaidConfigured()) {
    throw new Error("Plaid is not configured. Set PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV.");
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env.plaidEnv] ?? PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": env.plaidClientId,
        "PLAID-SECRET": env.plaidSecret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export const plaidDefaults = {
  products: [Products.Transactions],
  country_codes: [CountryCode.Us],
  language: "en",
  client_name: "Money Manager",
};
