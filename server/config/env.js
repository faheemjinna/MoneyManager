import dotenv from "dotenv";

dotenv.config();

const requiredInProduction = ["MONGODB_URI", "JWT_SECRET", "DATA_ENCRYPTION_KEY"];

for (const key of requiredInProduction) {
  if (process.env.NODE_ENV === "production" && !process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "replace-this-dev-secret",
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY ?? "replace-this-with-32-byte-key-material",
  plaidClientId: process.env.PLAID_CLIENT_ID ?? "",
  plaidSecret: process.env.PLAID_SECRET ?? "",
  plaidEnv: process.env.PLAID_ENV ?? "sandbox",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? `http://localhost:${Number(process.env.PORT ?? 4000)}/api/calendar/google/callback`,
};
