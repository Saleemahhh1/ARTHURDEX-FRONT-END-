// config.js
// Put your runtime overrides here or set window.arthurdexConfig before loading app.js

// WalletConnect Project ID (for HashPack/WalletConnect V2)
const PROJECT_ID = "031c9ba70da1c67907ed7484f7a6aa64";

// Backend URL — do NOT put trailing slash or "/api"
// You can override at runtime by setting window.arthurdexConfig = { BACKEND_URL: "https://..." } before this file loads
const BACKEND_URL = (window?.arthurdexConfig?.BACKEND_URL || "https://arthurdex.onrender.com").replace(/\/+$/, "");

// Expose config globally (app.js reads this)
window.arthurdexConfig = Object.assign({
  PROJECT_ID,
  BACKEND_URL
}, window.arthurdexConfig || {});
