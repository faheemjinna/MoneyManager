# Money Manager

A MongoDB-backed React finance workspace with secure signup/signin, separated account/card/transaction/budget collections, encrypted institution tokens, and Plaid-ready live bank/card connections.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` with your private MongoDB URI and generated secrets. Do not commit `.env`.

Generate a strong encryption key:

```bash
openssl rand -base64 32
```

## Development

Run the API and frontend together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:api
npm run dev:web
```

Open the URL Vite prints, usually `http://localhost:5173`.

## Live account/card connections

Live connections use Plaid Link. Add `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_ENV` to `.env`. The app creates a Link token, exchanges the public token server-side, encrypts the Plaid access token in MongoDB, and syncs live accounts, credit cards, and transactions into separate collections.

If the app shows `Plaid setup needed`, your API is running but Plaid credentials are not set yet. Add your Plaid sandbox/development keys to `.env`, then restart `npm run dev`.

In `PLAID_ENV=sandbox`, do not use your real phone number in Plaid Link. Use one of Plaid's seeded sandbox phone numbers, such as `415-555-0010`, and OTP `123456`. For sandbox institution credentials, use `user_good` / `pass_good` unless you are testing a special scenario.

## Production

```bash
npm run build
npm start
```

Rotate any database password that has ever been pasted into chat or committed locally.
