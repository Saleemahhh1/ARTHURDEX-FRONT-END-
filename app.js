// app.js (ArthurDex frontend - full flow, crash-proof)
// IMPORTANT: Update BACKEND_URL if your backend is at a different URL
const PROJECT_ID = "031c9ba70da1c67907ed7484f7a6aa64";
const BACKEND_URL = "https://arthurdex.onrender.com"; // ← use your Render URL

/* ---------------- DOM ---------------- */
const $ = id => document.getElementById(id);
const introLine = $("introLine");
const introScreen = $("intro");
const powered = $("powered");
const termsScreen = $("terms");
const optionsScreen = $("options");
const flowContainer = $("flowContainer");
const mainScreen = $("main");
const hbarEl = $("hbarAmount");
const usdtEl = $("usdtAmount");
const txListEl = $("txList");
const txSeeMore = $("txSeeMore");
const txSpinner = $("txSpinner");
const tokenBlocks = $("tokenBlocks");
const activityList = $("activityList");
const accountShort = $("accountShort");
const modalEl = $("modal");

/* ---------------- Utilities ---------------- */
function el(tag, opts = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(opts).forEach(([k, v]) => {
    if (k === "className") e.className = v;
    else if (k === "onclick") e.onclick = v;
    else if (k === "id") e.id = v;
    else e.setAttribute(k, v);
  });
  children.forEach(c => {
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  });
  return e;
}
function clearFlow(){ flowContainer.innerHTML = ''; }
function appendFlowCard(title, nodes=[]){
  clearFlow();
  const c = el('div', { className: 'card' });
  c.appendChild(el('h3', {}, title));
  nodes.forEach(n => c.appendChild(n));
  flowContainer.appendChild(c);
  return c;
}
function showModal(title, contentNode){
  modalEl.innerHTML = '';
  modalEl.classList.remove('hidden');
  const card = el('div',{className:'card'});
  const h = el('h3',{}, title);
  const close = el('button',{className:'btn small', onclick: modalClose}, 'Close');
  card.appendChild(h);
  card.appendChild(contentNode);
  card.appendChild(close);
  modalEl.appendChild(card);
  modalEl.setAttribute('aria-hidden','false');
}
function modalClose(){ modalEl.classList.add('hidden'); modalEl.innerHTML=''; modalEl.setAttribute('aria-hidden','true'); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* ---------------- Intro sequence ---------------- */
const introSteps = ["DEFIN SECURE DECENTRALIZED", "TOKENIZED REAL WORLD ASSETS", "POWERED BY HEDERA"];
async function typeWriter(targetEl, text, speed=50){
  targetEl.textContent = '';
  for(let i=0;i<text.length;i++){
    targetEl.textContent += text.charAt(i);
    await sleep(speed);
  }
  await sleep(600);
}
async function runIntro(){
  try{
    for (let s of introSteps){
      await typeWriter(introLine, s, 45);
      introLine.textContent = '';
    }
    powered.classList.remove('hidden');
    await sleep(700);
    introScreen.classList.add('hidden');
    powered.classList.add('hidden');
    termsScreen.classList.remove('hidden');
  }catch(e){
    console.error('Intro error', e);
    // fallback: show terms
    introScreen.classList.add('hidden');
    termsScreen.classList.remove('hidden');
  }
}
runIntro();

/* ---------------- Storage / crypto helpers ---------------- */
const STORAGE_KEY = 'arthurdex_vault_v2';
function loadVault(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e){ return {}; } }
function saveVault(v){ localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); }
function ensureVault(){ let v = loadVault(); if(!v.salt){ v.salt = cryptoRandomHex(16); v.accounts = {}; saveVault(v); } return v; }
function cryptoRandomHex(len){ const arr = crypto.getRandomValues(new Uint8Array(len)); return Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join(''); }

/* --------------- Passphrase generator 18 words --------------- */
const WORDS = ["apple","river","stone","future","cloud","trust","secure","asset","ledger","open","wallet","token","value","earth","honest","light","unity","chain","hash","proof","smart","global","peace","digital","truth","real","power","safe"];
function gen18(){ return Array.from({length:18},()=>WORDS[Math.floor(Math.random()*WORDS.length)]).join(' '); }

/* --------------- Network helpers (with timeout + error) --------------- */
async function guardedFetch(url, opts={}, timeout=12000){
  try{
    const controller = new AbortController();
    const id = setTimeout(()=>controller.abort(), timeout);
    const res = await fetch(url, {...opts, signal:controller.signal});
    clearTimeout(id);
    if(!res.ok) {
      const txt = await res.text().catch(()=>null);
      throw new Error(`HTTP ${res.status} - ${txt||res.statusText}`);
    }
    const json = await res.json().catch(()=>null);
    return { ok: true, data: json };
  }catch(err){
    console.warn('guardedFetch error', url, err?.message || err);
    return { ok:false, error: err };
  }
}

/* ---------------- UI hookups ---------------- */
$('btnAccept').addEventListener('click', ()=>{
  const chk = $('acceptTerms');
  if(!chk.checked){ alert('Please accept terms'); return; }
  termsScreen.classList.add('hidden');
  optionsScreen.classList.remove('hidden');
  appendFlowCard('Welcome', [ el('p',{}, 'Choose an option to get started') ]);
});
$('btnCreatePass').addEventListener('click', ()=>{
  const p = gen18();
  showPassphraseFlow(p);
});
$('btnQuiz').addEventListener('click', ()=> showQuizFlow());
$('btnRecover').addEventListener('click', ()=> showRecoveryFlow());
$('btnLogin').addEventListener('click', ()=> showLoginFlow());

/* ---------------- Passphrase flow (copy + verify 4 random) ---------------- */
function showPassphraseFlow(passphrase){
  const passEl = el('p',{className:'passphrase'}, passphrase);
  const copyBtn = el('button',{className:'btn'}, 'Copy passphrase');
  const verifyBtn = el('button',{className:'btn'}, 'Verify & Create Account');
  const hint = el('div',{className:'hint'}, 'Copy and keep it safe. You will verify 4 words.');
  copyBtn.onclick = async ()=>{
    try{ await navigator.clipboard.writeText(passphrase); copyBtn.textContent='Copied ✓'; copyBtn.disabled=true; }
    catch(e){ alert('Copy failed, copy manually.'); }
  };
  verifyBtn.onclick = ()=> showPassphraseVerify(passphrase, true);
  appendFlowCard('Your 18-word passphrase', [passEl, hint, el('div',{}, copyBtn, verifyBtn)]);
}
function showPassphraseVerify(passphrase, autoRegister=false){
  clearFlow();
  const words = passphrase.split(/\s+/);
  const total = 18;
  const idxs = [];
  while(idxs.length<4){ let r=Math.floor(Math.random()*total); if(!idxs.includes(r)) idxs.push(r); }
  idxs.sort((a,b)=>a-b);
  const instr = el('p',{className:'hint'}, `Enter words #${idxs.map(i=>i+1).join(', ')}`);
  const inputs = idxs.map(i=> el('input',{placeholder:`Word ${i+1}`, style:'width:100%;padding:8px;margin:6px 0;border-radius:6px'}));
  const fb = el('div',{className:'muted'});
  const btn = el('button',{className:'btn'}, 'Confirm');
  btn.onclick = async ()=>{
    const ok = inputs.every((inp,j)=> inp.value.trim().toLowerCase() === words[idxs[j]]);
    if(!ok){ fb.textContent='❌ Incorrect word(s)'; fb.style.color='#ff7b7b'; return; }
    fb.textContent='✅ Verified';
    fb.style.color='#9fffcc';
    // Ask for password (and register user)
    await showPasswordCreationAndRegister(passphrase);
  };
  appendFlowCard('Verify passphrase', [instr, ...inputs, btn, fb]);
}

/* ---------------- Password creation + register to backend ---------------- */
async function showPasswordCreationAndRegister(passphrase){
  clearFlow();
  const username = el('input',{placeholder:'Choose a username', style:'width:100%;padding:8px'});
  const p1 = el('input',{placeholder:'Create a strong password (min 8 chars)', type:'password', style:'width:100%;padding:8px'});
  const p2 = el('input',{placeholder:'Confirm password', type:'password', style:'width:100%;padding:8px'});
  const fb = el('div',{className:'muted'});
  const btn = el('button',{className:'btn'}, 'Register & Continue');
  btn.onclick = async ()=>{
    if(!username.value || !p1.value || p1.value.length<8){ fb.textContent='Choose username and password (min 8 chars)'; return; }
    if(p1.value !== p2.value){ fb.textContent='Passwords do not match'; return; }
    fb.textContent = 'Registering...';
    // POST to backend /auth/register
    const payload = { username: username.value.trim(), password: p1.value, passphrase };
    const r = await guardedFetch(`${BACKEND_URL}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }, 15000);
    if(!r.ok){ fb.textContent = `Register failed: ${r.error?.message||'unknown'}`; fb.style.color='#ff9f9f'; console.warn(r.error); return; }
    // save token locally
    const token = r.data?.token;
    if(token){
      const vault = ensureVault();
      vault.auth = { token, username: username.value.trim() };
      saveVault(vault);
    }
    fb.textContent='✅ Registered — entering dashboard';
    await sleep(800);
    goToMainDashboard();
  };
  appendFlowCard('Create password for your wallet', [ username, p1, p2, btn, fb ]);
}

/* ---------------- Login flow ---------------- */
function showLoginFlow(){
  clearFlow();
  const u = el('input',{placeholder:'Username', style:'width:100%;padding:8px'});
  const pw = el('input',{placeholder:'Password', type:'password', style:'width:100%;padding:8px'});
  const fb = el('div',{className:'muted'});
  const btn = el('button',{className:'btn'}, 'Login');
  btn.onclick = async ()=>{
    if(!u.value || !pw.value){ fb.textContent='Enter username & password'; return; }
    fb.textContent='Logging in...';
    const r = await guardedFetch(`${BACKEND_URL}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: u.value.trim(), password: pw.value }) }, 12000);
    if(!r.ok){ fb.textContent=`Login failed: ${r.error?.message||'unknown'}`; fb.style.color='#ff9f9f'; return; }
    const token = r.data?.token;
    if(token){
      const vault = ensureVault();
      vault.auth = { token, username: u.value.trim() };
      saveVault(vault);
      fb.textContent='✅ Logged in';
      await sleep(500);
      goToMainDashboard();
    } else {
      fb.textContent='Login succeeded but no token returned';
    }
  };
  appendFlowCard('Login', [u, pw, btn, fb]);
}

/* ---------------- Recovery flow ---------------- */
function showRecoveryFlow(){
  clearFlow();
  const inp = el('textarea',{placeholder:'Paste your 18-word passphrase or private key', style:'width:100%;min-height:100px'});
  const fb = el('div',{className:'muted'});
  const btn = el('button',{className:'btn'}, 'Recover');
  btn.onclick = async ()=>{
    const text = inp.value.trim();
    if(!text){ fb.textContent='Enter passphrase or private key'; return; }
    // If 18 words -> forward to backend recover endpoint (server will find user by passphrase)
    if(text.split(/\s+/).length === 18){
      fb.textContent = 'Recovering by passphrase...';
      const r = await guardedFetch(`${BACKEND_URL}/auth/recover`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ passphrase: text }) }, 12000);
      if(!r.ok){ fb.textContent = `Recover failed: ${r.error?.message||'unknown'}`; fb.style.color='#ff9f9f'; return; }
      const token = r.data?.token;
      if(token){
        const vault = ensureVault(); vault.auth = { token }; saveVault(vault);
        fb.textContent='✅ Recovered — entering dashboard';
        await sleep(600);
        goToMainDashboard();
      } else {
        fb.textContent='Recover succeeded but no token';
      }
    } else {
      // treat as private key: not recommended for browser — we only simulate: ask to register with it as passphrase
      fb.textContent = 'Treating input as private key: creating local account...';
      const passphrase = '(recovered-privatekey)';
      await showPasswordCreationAndRegister(passphrase);
    }
  };
  appendFlowCard('Recover Account', [inp, btn, fb]);
}

/* ---------------- Quiz (3 Qs) ---------------- */
function showQuizFlow(){
  const qs = [
    {q:"IS ARTHURDEX A CUSTODIAL WALLET?", opts:["Yes","No"], correct:1},
    {q:"IF ANYONE ASKS FOR YOUR PASSPHRASE, WHAT DO YOU DO?", opts:["Give it","Block and avoid"], correct:1},
    {q:"IF YOU LOST YOUR ASSET, WILL ARTHURDEX RETURN IT?", opts:["Yes","No, I take responsibility"], correct:1}
  ];
  let qi = 0;
  const fb = el('div',{className:'muted'});
  function render(){
    if(qi >= qs.length){ const p = gen18(); showPassphraseFlow(p); return; }
    const cur = qs[qi];
    const optsBtns = cur.opts.map((opt, idx) => {
      const b = el('button',{className:'btn'}, opt);
      b.onclick = ()=> {
        if(idx === cur.correct){ fb.textContent='✅ Correct'; fb.style.color='#9fffcc'; qi++; setTimeout(render,700); }
        else { fb.textContent='❌ Wrong — try again'; fb.style.color='#ff9f9f'; }
      };
      return b;
    });
    appendFlowCard(`Quiz ${qi+1}/${qs.length}`, [ el('p',{}, cur.q), ...optsBtns, fb ]);
  }
  render();
}

/* ---------------- WalletConnect / HashPack connect (using CDN libs) ---------------- */
async function connectHashPackFlow(){
  appendFlowCard('Connecting HashPack', [ el('p',{}, 'Opening WalletConnect modal...') ]);
  try{
    if(!window.WalletConnectModal || !window.SignClient) {
      appendFlowCard('Error', [ el('p',{}, 'WalletConnect libraries are not available. Make sure scripts loaded.') ]);
      return;
    }
    const WalletConnectModal = window.WalletConnectModal.default || window.WalletConnectModal;
    const SignClient = window.SignClient.default || window.SignClient;
    const modal = new WalletConnectModal({ projectId: PROJECT_ID, standaloneChains: ["hedera:testnet"] });
    const signClient = await SignClient.init({ projectId: PROJECT_ID });
    const { uri, approval } = await signClient.connect({
      requiredNamespaces: {
        hedera: {
          methods: ["hedera_signMessage","hedera_signTransaction"],
          chains: ["hedera:testnet"],
          events: ["accountsChanged"]
        }
      }
    });
    if(uri) modal.openModal({ uri });
    const session = await approval();
    try{ modal.closeModal(); }catch(e){}
    // parse session
    const hederaNs = session.namespaces?.hedera;
    const acct = hederaNs?.accounts?.[0] || null;
    if(acct){
      const parts = acct.split(':'); const acctId = parts[2];
      const vault = ensureVault(); if(!vault.accounts) vault.accounts = {};
      if(!vault.accounts[acctId]) vault.accounts[acctId] = { accountId: acctId, hbar: 0, external: true };
      vault.activeAccountId = acctId;
      // store session token (no private key stored)
      saveVault(vault);
      goToMainDashboard();
    } else {
      appendFlowCard('Connected', [ el('p',{}, 'Connected but no Hedera account found.') ]);
    }
  }catch(e){
    appendFlowCard('Error', [ el('p',{}, 'Wallet connection failed.'), el('pre',{}, String(e?.message || e)) ]);
    console.error('connectHashPackFlow', e);
  }
}

/* ---------------- Dashboard: main actions ---------------- */
async function goToMainDashboard(){
  optionsScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  const vault = ensureVault();
  const active = vault.activeAccountId || null;
  accountShort.textContent = active ? String(active) : 'No account';

  hbarEl.textContent = '...'; usdtEl.textContent = '...';
  txListEl.innerHTML = ''; activityList.innerHTML = '';

  try{
    if(active){
      // call backend balance route
      const r = await guardedFetch(`${BACKEND_URL}/api/balance/${encodeURIComponent(active)}`, { method:'GET' }, 10000);
      if(r.ok && r.data){
        const json = r.data;
        const hbar = json.hbar ?? (vault.accounts?.[active]?.hbar ?? 0);
        const usdt = json.usdt ?? ((Number(hbar)||0) * 0.07).toFixed(2);
        hbarEl.textContent = hbar;
        usdtEl.textContent = usdt;
        // compute percentage change demo
        const pct = ((Math.random()*2 -1)*3).toFixed(2);
        $('hbarChange').textContent = pct>=0 ? `+${pct}%` : `${pct}%`;
        $('hbarChange').style.color = pct>=0 ? '#9fffcc' : '#ff9f9f';
      } else {
        hbarEl.textContent = 'N/A'; usdtEl.textContent = 'N/A';
      }
      // load transactions
      const tr = await guardedFetch(`${BACKEND_URL}/api/transactions/${encodeURIComponent(active)}`, {}, 10000);
      let list = [];
      if(tr.ok && tr.data){
        list = Array.isArray(tr.data) ? tr.data : (tr.data.transactions || []);
      }
      renderTxList(list.slice(0,4));
    } else {
      hbarEl.textContent = '—'; usdtEl.textContent = '—';
    }
  }catch(e){
    console.error('dashboard fetch error', e);
    hbarEl.textContent = '—'; usdtEl.textContent = '—';
    txListEl.textContent = 'Error loading data';
  }
  renderTokenBlocks();
  renderActivity();
}

function renderTxList(txs){
  txListEl.innerHTML = '';
  if(!txs || txs.length===0){ txListEl.innerHTML = '<div class="muted">No recent transactions</div>'; return; }
  txs.forEach(tx=>{
    const id = tx.txId || tx.id || tx.transaction_id || 'tx-?';
    const right = tx.amount ? `${tx.amount} HBAR` : '';
    const d = el('div',{className:'tx-item'}, `${id} — ${tx.result||tx.status||tx.name||''} — ${right}`);
    txListEl.appendChild(d);
  });
}
txSeeMore.addEventListener('click', async ()=>{
  txSpinner.classList.remove('hidden');
  try{
    const vault = ensureVault(); const active = vault.activeAccountId;
    const tr = await guardedFetch(`${BACKEND_URL}/api/transactions/${encodeURIComponent(active)}`, {}, 10000);
    let list = [];
    if(tr.ok && tr.data) list = Array.isArray(tr.data) ? tr.data : (tr.data.transactions || []);
    showModal('All transactions', el('div',{}, ...list.map(t=>el('p',{}, `${t.txId||t.id} • ${t.result||t.status}`))));
  }catch(e){ showModal('Transactions','Failed to load'); }
  finally{ txSpinner.classList.add('hidden'); }
});

/* ---------------- Token blocks / activity ---------------- */
function renderTokenBlocks(){
  tokenBlocks.innerHTML = '';
  for(let i=1;i<=3;i++){
    const b = el('div',{className:'token-block'}, el('div',{}, `Asset #${i}`), el('p',{className:'muted small'}, 'Sample description'), el('button',{className:'btn small', onclick: ()=> openTokenDetail(i)}, 'View'));
    tokenBlocks.appendChild(b);
  }
}
function openTokenDetail(i){
  showModal(`Tokenized Asset #${i}`, el('div',{}, el('p',{}, `Detailed description for tokenized asset ${i}.`), el('p',{}, el('em',{}, 'Coming Soon (demo)'))));
}
function renderActivity(){
  activityList.innerHTML = '';
  const v = loadVault(); const active = v.activeAccountId;
  const acts = [ `Account ${active} active`, `Connected to backend`, `Recent activity demo` ];
  acts.forEach(a=> activityList.appendChild(el('p',{}, a)));
}

/* ---------------- Hub actions: Receive / Send / Swap ---------------- */
$('hub-receive').onclick = ()=> {
  const vault = ensureVault();
  const acct = vault.activeAccountId;
  if(!acct) return showModal('Receive', el('div',{}, 'No active account'));
  showModal('Receive', el('div',{}, el('p',{}, `Your account: ${acct}`), el('button',{className:'btn', onclick: ()=> { navigator.clipboard.writeText(acct); alert('Copied'); }}, 'Copy address'), el('div',{}, el('img',{src:generateQRCodeDataUri(acct), style:'width:180px;marginTop:10px'}))));
};
$('hub-send').onclick = ()=> showSendModal();
$('hub-swap').onclick = ()=> showSwapModal();
$('hub-tokenized').onclick = ()=> showModal('Tokenized Assets (Preview)', el('div',{}, 'Tokenized module preview (work in progress)'));

/* ---------------- Send modal (with password check via backend verify) ---------------- */
function showSendModal(){
  const to = el('input',{placeholder:'Recipient Account ID', style:'width:100%;padding:8px'});
  const amt = el('input',{placeholder:'Amount (HBAR)', style:'width:100%;padding:8px'});
  const fb = el('div',{className:'muted'});
  const btn = el('button',{className:'btn'}, 'Send');
  btn.onclick = async ()=>{
    const toVal = to.value.trim(), amount = parseFloat(amt.value);
    if(!toVal || isNaN(amount) || amount<=0){ fb.textContent='Invalid input'; fb.style.color='#ff9f9f'; return; }
    const vault = ensureVault(); const active = vault.activeAccountId; const acct = vault.accounts?.[active];
    const curBal = acct?.hbar ?? 0;
    if(amount > curBal){ fb.textContent = 'Insufficient amount'; fb.style.color='#ff9f9f'; return; }
    // require password unlock: call backend verify-password if token exists
    let unlocked = false;
    const token = vault.auth?.token;
    if(token){
      const pw = prompt('Enter your wallet password to confirm send'); // simpler UX; can be modal
      if(!pw){ fb.textContent='Authorization cancelled'; return; }
      const r = await guardedFetch(`${BACKEND_URL}/auth/verify-password`, { method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ password: pw }) }, 10000);
      if(r.ok && r.data?.success){ unlocked = true; }
      else { fb.textContent='Password verification failed'; fb.style.color='#ff9f9f'; return; }
    } else {
      // fallback local unlock
      const ok = confirm('No authenticated server session. Confirm send locally? (This demo will deduct local balance only)');
      if(!ok) return;
      unlocked = true;
    }
    if(unlocked){
      acct.hbar -= amount;
      saveVault(vault);
      const tx = { txId: 'tx-'+cryptoRandomHex(4), from: active, to: toVal, amount, status:'Success', createdAt: new Date().toISOString() };
      const txs = JSON.parse(localStorage.getItem('arthurdex_local_txs')||'[]'); txs.unshift(tx); localStorage.setItem('arthurdex_local_txs', JSON.stringify(txs));
      fb.textContent = '✅ Sent'; fb.style.color='#9fffcc';
      await sleep(700);
      goToMainDashboard();
    }
  };
  showModal('Send HBAR', el('div',{}, to, amt, btn, fb));
}

/* ---------------- Swap (demo) ---------------- */
function showSwapModal(){
  const direction = el('select',{}, el('option',{}, 'HBAR → USDT'), el('option',{}, 'USDT → HBAR'));
  const amt = el('input',{placeholder:'Amount', style:'width:100%;padding:8px'});
  const fb = el('div',{className:'muted'});
  const btn = el('button',{className:'btn'}, 'Swap (demo)');
  btn.onclick = async ()=>{
    const a = parseFloat(amt.value); if(isNaN(a)||a<=0){ fb.textContent='Invalid amount'; fb.style.color='#ff9f9f'; return; }
    const v = ensureVault(); const active = v.activeAccountId; const acct = v.accounts?.[active];
    acct.hbar = Math.max(0, (acct.hbar||0) - Math.round(a));
    saveVault(v);
    fb.textContent = '✅ Swap simulated'; fb.style.color='#9fffcc';
    await sleep(500);
    goToMainDashboard();
  };
  showModal('Swap', el('div',{}, direction, amt, btn, fb));
}

/* ---------------- Unlock helpers (WebAuthn & fallback) ---------------- */
async function askForUnlock(){
  const vault = ensureVault();
  if(vault.webauthn){
    try{
      await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), timeout:60000 } });
      return true;
    }catch(e){ console.warn('webauthn get failed', e); }
  }
  const pw = prompt('Enter your wallet password to unlock');
  if(!pw) return false;
  // Try verifying with backend if token present
  if(vault.auth?.token){
    const r = await guardedFetch(`${BACKEND_URL}/auth/verify-password`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${vault.auth.token}`}, body: JSON.stringify({ password: pw }) }, 8000);
    return (r.ok && r.data?.success) || false;
  }
  // Local brute: if we had stored encrypted data you'd decrypt here. For now accept any non-empty for demo.
  return pw.length>0;
}

/* ---------------- QR helper (simple svg placeholder) ---------------- */
function generateQRCodeDataUri(text){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><rect width='180' height='180' fill='#0b0f1a'/><text x='10' y='90' fill='#00c8d1' font-size='10'>${text.slice(0,20)}...</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* ---------------- Account management & backup ---------------- */
$('btnAccount').addEventListener('click', ()=> {
  const vault = ensureVault();
  const accounts = Object.values(vault.accounts || {});
  const nodes = accounts.map(a=>{
    const sw = el('button',{className:'btn small', onclick: ()=>{ vault.activeAccountId = a.accountId; saveVault(vault); modalClose(); goToMainDashboard(); }}, `Switch`);
    const del = el('button',{className:'btn small', onclick: async ()=>{ if(confirm('Delete account permanently?')){ const ok = await askForUnlock(); if(!ok) return; delete vault.accounts[a.accountId]; if(vault.activeAccountId===a.accountId) vault.activeAccountId = Object.keys(vault.accounts)[0] || null; saveVault(vault); modalClose(); goToMainDashboard(); } }}, 'Delete');
    return el('div',{}, el('strong',{}, a.accountId), el('div',{}, sw, del));
  });
  const backupBtn = el('button',{className:'btn', onclick: ()=> showBackupModal()}, 'Backup (passphrase/private key)');
  showModal('Manage Accounts', el('div',{}, ...nodes, backupBtn));
});

async function showBackupModal(){
  const vault = ensureVault(); const active = vault.activeAccountId;
  if(!active) return showModal('Backup', el('div',{}, 'No active account'));
  const pw = el('input',{type:'password', placeholder:'Enter your password', style:'width:100%;padding:8px'});
  const fb = el('div',{className:'muted'});
  const btn = el('button',{className:'btn'}, 'Show');
  btn.onclick = async ()=>{
    // In this front-end-only implementation, passphrase is stored plaintext under account.passphraseEncrypted? maybe not.
    // We try to show stored passphrase / privateKey if present in vault (demo)
    const v = loadVault(); const acct = v.accounts[active];
    const pass = acct?.passphrase || '(not stored)';
    const priv = acct?.privateKey || '(not stored)';
    showModal('Backup', el('div',{}, el('p',{}, 'Passphrase:'), el('pre',{}, pass), el('p',{}, 'Private Key:'), el('pre',{}, priv), el('button',{className:'btn', onclick: ()=> { navigator.clipboard.writeText(pass); alert('Copied'); }}, 'Copy passphrase')));
  };
  showModal('Backup', el('div',{}, pw, btn, fb));
}

/* ---------------- init placeholder ---------------- */
appendFlowCard('Welcome', [ el('p',{}, 'Choose an option to get started') ]);
