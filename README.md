# # ArthurDex — Frontend

This repository contains the ArthurDex frontend (static SPA).  
It implements the UX flows: intro animation, Terms & Conditions, Wallet options (HashPack connect, Generate passphrase, Quiz & Create Wallet, Recover account), password creation + registration with backend, main dashboard, receive/send/swap previews, tokenized asset preview and transactions.

## Quick start (deploy to Netlify / Vercel)
1. Put files `index.html`, `style.css`, `app.js`, and `arthurdex-logo.png` in project root.
2. Edit `app.js` and set `BACKEND_URL` to your backend (e.g. `https://arthurdex.onrender.com`) and `PROJECT_ID` to your WalletConnect project id.
3. Deploy as a static site (Netlify / Vercel / GitHub Pages).

## Features
- Intro animation (typewriter)
- Terms & Conditions gating
- Wallet options: HashPack via WalletConnect modal, passphrase generation (18 words) + 4-word verification, quiz, recover account
- Register/login flow that posts to backend `/auth/register` and `/auth/login`
- Dashboard that shows HBAR balance, USD equivalent, transactions (pulled from backend)
- Send & Swap demo flows with password verification (server-supported)
- Receive screen with QR placeholder
- Account management & backup modal (shows stored data if present)
- Crash-proof patterns: try/catch for network calls, guarded fetch with timeout, helpful error messages.

## Notes / Security
- The frontend only stores lightweight vault metadata in `localStorage`. Do **not** store unencrypted private keys in production.
- **Backend must provide** CORS header `Access-Control-Allow-Origin: *` (or appropriate origin). We recommend the backend uses:
  ```js
  app.use(cors({ origin: "*" }));
