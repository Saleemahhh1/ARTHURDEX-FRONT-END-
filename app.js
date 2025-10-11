// app.js (full build with console logs intact)
async function guardedFetch(rawUrl, opts = {}, timeout = 10000) {
  let url = rawUrl;
  if (typeof rawUrl === 'string' && rawUrl.startsWith('/')) {
    url = `${BACKEND_URL}${rawUrl}`;
  } else if (typeof rawUrl === 'string' && !/^https?:\/\//i.test(rawUrl)) {
    url = `${BACKEND_URL}/${rawUrl}`.replace(/\/+/g, '/');
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) {
      let txt;
      try { txt = await res.text(); } catch (e) { txt = res.statusText; }
      throw new Error(`HTTP ${res.status} - ${txt || res.statusText}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const json = await res.json();
      return { ok: true, data: json };
    } else {
      const text = await res.text();
      return { ok: true, data: text };
    }
  } catch (err) {
    clearTimeout(id);
    console.warn('[guardedFetch] error', rawUrl, err && err.message ? err.message : err);
    return { ok: false, error: err };
  } finally {
    clearTimeout(id);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Arthurdex frontend initialized ✅");

  const introLine = document.getElementById('introLine');
  const introScreen = document.getElementById('intro');
  const powered = document.getElementById('powered');
  const termsScreen = document.getElementById('terms');
  const optionsScreen = document.getElementById('options');
  const flowContainer = document.getElementById('flowContainer');
  const mainScreen = document.getElementById('main');
  const hbarEl = document.getElementById('hbarAmount');
  const usdtEl = document.getElementById('usdtAmount');
  const txListEl = document.getElementById('txList');
  const txSeeMore = document.getElementById('txSeeMore');
  const txSpinner = document.getElementById('txSpinner');
  const tokenBlocks = document.getElementById('tokenBlocks');
  const activityList = document.getElementById('activityList');
  const accountShort = document.getElementById('accountShort');
  const modalEl = document.getElementById('modal');

  function el(tag, opts = {}, ...children) {
    const e = document.createElement(tag);
    Object.entries(opts).forEach(([k, v]) => {
      if (k === 'className') e.className = v;
      else if (k === 'onclick') e.onclick = v;
      else if (k === 'id') e.id = v;
      else e.setAttribute(k, v);
    });
    children.forEach(c => {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  }

  function clearFlow() { if (flowContainer) flowContainer.innerHTML = ''; }
  function appendFlowCard(title, nodes = []) {
    if (!flowContainer) return;
    clearFlow();
    const c = el('div', { className: 'card' });
    c.appendChild(el('h3', {}, title));
    nodes.forEach(n => c.appendChild(n));
    flowContainer.appendChild(c);
    return c;
  }

  function showModal(title, contentNode) {
    if (!modalEl) return;
    modalEl.innerHTML = '';
    modalEl.classList.remove('hidden');
    const card = el('div', { className: 'card' });
    card.appendChild(el('h3', {}, title));
    card.appendChild(contentNode);
    const close = el('button', { className: 'btn small', onclick: modalClose }, 'Close');
    card.appendChild(close);
    modalEl.appendChild(card);
    modalEl.setAttribute('aria-hidden', 'false');
  }

  function modalClose() {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    modalEl.innerHTML = '';
    modalEl.setAttribute('aria-hidden', 'true');
  }

  const introSteps = ["secure smartest decentralized", "tokenized real world asset", "POWERED BY HEDERA"];
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async function typeWriter(targetEl, text, speed = 50) {
    if (!targetEl) return;
    targetEl.textContent = '';
    for (let i = 0; i < text.length; i++) {
      targetEl.textContent += text.charAt(i);
      await sleep(speed);
    }
    await sleep(600);
  }

  // === INTRO SEQUENCE ===
function runIntro() {
  const introLine = $('introLine');
  const powered = $('powered');
  let i = 0;
  const text = "Welcome to ArthurDex";

  // Typewriter effect
  const interval = setInterval(() => {
    introLine.textContent += text[i++];
    if (i >= text.length) {
      clearInterval(interval);
      powered.classList.remove('hidden');

      // 🔸 Jira seconds 2 kafin komawa "Terms & Conditions"
      setTimeout(() => {
        showScreen('terms');
      }, 2000);
    }
  }, 80);
}

  const STORAGE_KEY = 'arthurdex_vault_v2';
  function loadVault() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; } }
  function saveVault(v) { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); }
  function ensureVault() {
    let v = loadVault();
    if (!v.salt) { v.salt = cryptoRandomHex(16); v.accounts = {}; saveVault(v); }
    return v;
  }
  function cryptoRandomHex(len) {
    const arr = crypto.getRandomValues(new Uint8Array(len));
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const WORDS = ["apple","river","stone","future","cloud","trust","secure","asset","ledger","open","wallet","token","value","earth","honest","light","unity","chain","hash","proof","smart","global","peace","digital","truth","real","power","safe"];
  function gen18(){ return Array.from({length:18}, ()=> WORDS[Math.floor(Math.random()*WORDS.length)]).join(' '); }

  function $(id) { return document.getElementById(id); }
  function attach(id, ev, fn) {
    const node = $(id);
    if (!node) { console.warn('attach: element not found', id); return; }
    node.addEventListener(ev, fn);
  }

  attach('btnAccept', 'click', () => {
    const chk = $('accept-terms');
    if (!chk || !chk.checked) { alert('Please accept-terms'); return; }
    if (termsScreen) termsScreen.classList.add('hidden');
    if (optionsScreen) optionsScreen.classList.remove('hidden');
    appendFlowCard('Welcome', [el('p', {}, 'Choose an option to get started')]);
  });

  attach('btnCreatePass', 'click', () => { const p = gen18(); showPassphraseFlow(p); });
  attach('btnQuiz', 'click', () => showQuizFlow());
  attach('btnRecover', 'click', () => showRecoveryFlow());
  attach('btnLogin', 'click', () => showLoginFlow());
  attach('btnConnectHashpack', 'click', () => connectHashPackFlow());
  attach('btnLogout', 'click', () => {
    const v = ensureVault(); delete v.auth; saveVault(v); location.reload();
  });

  // === CONTINUATION main.js (Part 2/2, final full build) ===

// 🧠 --- REGISTER, LOGIN, RECOVERY, & QUIZ FLOWS ---
function showPassphraseFlow(passphrase) {
  appendFlowCard('Your Passphrase', [
    el('p', {}, 'Write down your secret 18-word passphrase:'),
    el('div', { className: 'passphraseBox' }, passphrase),
    el('button', { className: 'btn', onclick: () => { showQuizFlow(passphrase); } }, 'Continue')
  ]);
}

function showQuizFlow(correctPass) {
  const quizWords = correctPass ? correctPass.split(' ') : [];
  const qIndex = Math.floor(Math.random() * quizWords.length);
  const qWord = quizWords[qIndex];
  const input = el('input', { type: 'text', placeholder: `Enter word #${qIndex + 1}` });
  const verify = el('button', { className: 'btn', onclick: () => {
    if (input.value.trim().toLowerCase() === qWord.toLowerCase()) {
      finalizeVaultSetup(correctPass);
    } else {
      alert('Incorrect word, please try again');
    }
  }}, 'Verify');
  appendFlowCard('Verification', [input, verify]);
}

function finalizeVaultSetup(passphrase) {
  const vault = ensureVault();
  vault.passphrase = passphrase;
  vault.created = Date.now();
  saveVault(vault);
  console.log('Vault created successfully');
  showLoginFlow();
}

function showLoginFlow() {
  appendFlowCard('Login', [
    el('input', { id: 'loginPass', type: 'password', placeholder: 'Enter passphrase' }),
    el('button', { className: 'btn', onclick: () => {
      const pass = $('loginPass').value.trim();
      if (!pass) return alert('Enter passphrase');
      const v = ensureVault();
      if (v.passphrase && v.passphrase.trim() === pass) {
        v.auth = { loggedIn: true, ts: Date.now() };
        saveVault(v);
        showDashboard();
      } else {
        alert('Wrong passphrase');
      }
    }}, 'Login')
  ]);
}

function showRecoveryFlow() {
  appendFlowCard('Recover Vault', [
    el('textarea', { id: 'recoverInput', placeholder: 'Enter your 18-word passphrase' }),
    el('button', { className: 'btn', onclick: () => {
      const val = $('recoverInput').value.trim();
      if (!val) return alert('Enter passphrase');
      const words = val.split(' ');
      if (words.length !== 18) return alert('Invalid passphrase');
      const v = ensureVault();
      v.passphrase = val;
      saveVault(v);
      alert('Vault recovered successfully!');
      showLoginFlow();
    }}, 'Recover')
  ]);
}

// === DASHBOARD ===
async function showDashboard() {
  console.log('Opening dashboard...');
  clearFlow();
  mainScreen.classList.remove('hidden');
  optionsScreen.classList.add('hidden');
  updateBalanceUI();
  loadActivity();
}

function updateBalanceUI() {
  const vault = ensureVault();
  if (vault.balances) {
    hbarEl.textContent = vault.balances.hbar || '0.00';
    usdtEl.textContent = vault.balances.usdt || '0.00';
  } else {
    hbarEl.textContent = '--';
    usdtEl.textContent = '--';
  }
}

async function loadActivity() {
  console.log('Loading activity...');
  activityList.innerHTML = '<li>Fetching...</li>';
  const res = await guardedFetch('/api/activity');
  if (!res.ok) {
    activityList.innerHTML = '<li>Error loading activity</li>';
    return;
  }
  const acts = res.data || [];
  activityList.innerHTML = '';
  acts.forEach(a => {
    const li = el('li', {}, `${a.type}: ${a.amount} ${a.token}`);
    activityList.appendChild(li);
  });
}

// === SEND & SWAP FUNCTIONS ===
function showSendFlow() {
  const inputAddr = el('input', { id: 'sendAddr', placeholder: 'Recipient address' });
  const inputAmt = el('input', { id: 'sendAmt', type: 'number', placeholder: 'Amount' });
  const btn = el('button', { className: 'btn', onclick: async () => {
    const addr = inputAddr.value.trim(), amt = parseFloat(inputAmt.value);
    if (!addr || isNaN(amt)) return alert('Enter valid details');
    console.log('Sending transaction...', addr, amt);
    const res = await guardedFetch('/api/send', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ addr, amt })
    });
    if (!res.ok) alert('Send failed'); else alert('Transaction sent!');
  }}, 'Send');
  appendFlowCard('Send HBAR', [inputAddr, inputAmt, btn]);
}

function showSwapFlow() {
  const inputAmt = el('input', { id: 'swapAmt', type: 'number', placeholder: 'Amount HBAR' });
  const btn = el('button', { className: 'btn', onclick: async () => {
    const amt = parseFloat(inputAmt.value);
    if (isNaN(amt)) return alert('Invalid amount');
    console.log('Swapping...', amt);
    const res = await guardedFetch('/api/swap', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ amt })
    });
    if (!res.ok) alert('Swap failed'); else alert('Swap success!');
  }}, 'Swap to USDT');
  appendFlowCard('Swap', [inputAmt, btn]);
}

// === BACKUP ===
function showBackupFlow() {
  const vault = ensureVault();
  const box = el('div', { className: 'backupBox' }, vault.passphrase || '(none)');
  appendFlowCard('Backup Your Vault', [
    el('p', {}, 'Keep your passphrase safe.'),
    box,
    el('button', { className: 'btn', onclick: () => navigator.clipboard.writeText(box.textContent) }, 'Copy')
  ]);
}

// === QR & CONNECT ===
function connectHashPackFlow() {
  console.log('Connecting to HashPack...');
  appendFlowCard('Connect HashPack', [el('p', {}, 'Opening HashPack wallet...')]);
  setTimeout(() => {
    alert('HashPack connected!');
    showDashboard();
  }, 1500);
}
 // === HUB DASHBOARD BUTTONS ===
attach('hub-send', 'click', showSendFlow);
attach('hub-swap', 'click', showSwapFlow);
// === UTILS ===
function shortAcct(str) {
  if (!str) return '--';
  return str.slice(0, 6) + '...' + str.slice(-4);
}

// === INIT ===
const vault = ensureVault();
if (vault.auth && vault.auth.loggedIn) {
  showDashboard();
} else {
  console.log('User not logged in, showing options.');
  if (termsScreen) termsScreen.classList.add('hidden');
  if (optionsScreen) optionsScreen.classList.remove('hidden');
}
});
