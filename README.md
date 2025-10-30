📖 ArthurDex Frontend

ArthurDex Frontend is a next-generation DeFi dashboard built on Hedera Hashgraph.
It provides users with a clean UI to create, transfer, and track tokenized assets with speed, security, and transparency.


---

🚀 Features

🔐 Authentication (register, login, recover via passphrase)

💰 Wallet management (multi-account support)

🔄 Token operations (create, mint, associate, transfer)

📊 Real-time balances & token info via Hedera Mirror Node

💵 Live price feed from CoinGecko API

📱 Responsive UI (mobile & desktop)



---

🛠 Tech Stack

Frontend: React + Vite (or CRA depending on repo)

Styling: TailwindCSS + shadcn/ui

State: Context API / Zustand

API: ArthurDex Backend (/api/...)

Blockchain: Hedera Hashgraph SDK



---

📦 Installation

1. Clone the repo

git clone https://github.com/<your-username>/arthurdex-frontend.git
cd arthurdex-frontend

2. Install dependencies

npm install
# ko
yarn install

3. Configure environment variables

Create a .env file in the root folder:

API_BASE_URL=https://arthurdex-backend.com
VITE_APP_NAME=ArthurDex
API_NETWORK=testnet

🌍 Deployment

Vercel (recommended – one-click deploy)

Netlify

GitHub Pages

Render (static site)


Ensure that API URL (API_BASE_URL) points to your backend.


---

📡 API Integration

Frontend connects to backend routes such as:

POST /api/auth/register

POST /api/auth/login

POST /api/token/create

POST /api/token/transfer

GET  /api/account/balance/:id

GET  /api/prices



---

✅ Scripts

Command	Description

npm run dev	Run in development
npm run build	Build production bundle
npm run preview	Preview production build



---

👨‍💻 Contributing

1. Fork repo


2. Create feature branch: git checkout -b feature/awesome


3. Commit changes: git commit -m "Add awesome feature"


4. Push branch: git push origin feature/awesome


5. Open Pull Request
   


HEDERA CERTIFICATE 


https://drive.google.com/file/d/12gsJ8fjZDGLvyMJoTee5kwAYK3Axjt52/view?usp=sharing
📜 License

MIT License © 2025 ArthurDex Team
