# Personal Assistant

A MongoDB-backed React personal assistant with secure signup/signin, task management, an Apple-inspired calendar, editable notes, and a full finance module. Finance data remains split into account, card, transaction, and budget collections with encrypted institution tokens and Plaid-ready live bank/card connections.

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

## iPhone and Android

This React app is wrapped for native iOS and Android with Capacitor. The mobile app uses the same built React UI and talks to the same Node API.

### One-time setup

Install the normal web dependencies first:

```bash
npm install
```

For iPhone/iOS, install Xcode from the Mac App Store. For Android, install Android Studio and its default SDK tools.

### Local phone testing

Your phone or simulator cannot use `localhost` to reach the API on your Mac. Find your Mac's Wi-Fi IP:

```bash
ipconfig getifaddr en0
```

Add that API URL to `.env`:

```bash
VITE_API_BASE=http://YOUR_MAC_IP:4000
```

Example:

```bash
VITE_API_BASE=http://192.168.1.25:4000
```

Then run the API:

```bash
npm run dev:api
```

In another terminal, build and sync the native apps:

```bash
npm run mobile:sync
```

Open iOS in Xcode:

```bash
npm run mobile:ios
```

Choose an iPhone simulator or your plugged-in iPhone, then press Run in Xcode.

Open Android in Android Studio:

```bash
npm run mobile:android
```

Choose an emulator or plugged-in Android phone, then press Run in Android Studio.

For command-line Android builds, use Java 21. Android Studio includes one:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd android
./gradlew assembleDebug
```

After any React change, run `npm run mobile:sync` again before launching the native app. For a store-ready release, host the API on HTTPS, set `VITE_API_BASE` to that HTTPS URL, and include `capacitor://localhost` in `CLIENT_ORIGIN` on the server.

## Assistant modules

- **Today**: a daily command center for open tasks, upcoming events, pinned notes, and finance pulse.
- **Tasks**: track personal lists, priorities, due dates, and status.
- **Calendar**: add events manually or paste an email/invite to import meeting details, attendees, links, and location.
- **Notes**: create editable notes with tags and pinned favorites.
- **Finances**: manage accounts, credit cards, spending, budgets, rewards, backups, and Plaid sync.

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
