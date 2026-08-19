// wallet.js — подключение кошельков (Phantom/Solana + TON Connect)
import { t, onSettingsChange } from './settings.js?v=4';

let connectedWallet = null; // { type: 'phantom'|'ton', address, publicKey? }
let walletTokens    = [];
let solBalance      = null;
let tokenPrices     = {}; // mint -> { symbol, price, logo }

// Кеш цен (обновляем каждые 2 минуты)
let pricesCacheTime = 0;
const PRICES_TTL = 2 * 60 * 1000;

export function getWallet()       { return connectedWallet; }
export function getWalletTokens() { return walletTokens; }
export function getSolBalance()   { return solBalance; }
export function getTokenPrices()  { return tokenPrices; }

// ─── ЛОКАЛЬНОЕ ХРАНИЛИЩЕ ──────────────────────────────────────────────────────
const WALLET_STORAGE_KEY = 'oracul_wallet_data';

function saveWalletToStorage() {
  if (!connectedWallet) {
    localStorage.removeItem(WALLET_STORAGE_KEY);
    return;
  }
  const data = {
    type: connectedWallet.type,
    address: connectedWallet.address,
    timestamp: Date.now(),
  };
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(data));
}

function loadWalletFromStorage() {
  try {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// ─── ЦЕНЫ ТОКЕНОВ ─────────────────────────────────────────────────────────────
async function fetchTokenPrices(mints) {
  try {
    if (!mints || !mints.length) return {};

    // Получаем цены через наш сервер (который прокси-ирует к DexScreener)
    const prices = {};

    // Сначала пытаемся через DexScreener для каждого токена
    const results = await Promise.allSettled(
      mints.map(mint =>
        fetch(`/api/coins/${mint}`, {
          headers: { 'User-Agent': 'ORACUL/1.0' }
        })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data?.pairs?.length) return null;
          const pair = data.pairs[0];
          return {
            mint,
            symbol: pair.baseToken?.symbol || '?',
            price: parseFloat(pair.priceUsd) || 0,
            logo: pair.info?.imageUrl || '',
            change24h: pair.priceChange?.h24 || 0,
          };
        })
        .catch(() => null)
      )
    );

    results.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value) {
        prices[mints[i]] = res.value;
      }
    });

    // SOL цена
    try {
      const solRes = await fetch(`/api/coins/So11111111111111111111111111111111111111112`, {
        headers: { 'User-Agent': 'ORACUL/1.0' }
      });
      if (solRes.ok) {
        const solData = await solRes.json();
        const solPair = solData.pairs?.[0];
        if (solPair) {
          prices['So11111111111111111111111111111111111111112'] = {
            mint: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            price: parseFloat(solPair.priceUsd) || 0,
            logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
            change24h: solPair.priceChange?.h24 || 0,
          };
        }
      }
    } catch {}

    return prices;
  } catch (e) {
    console.error('[wallet] fetchTokenPrices error:', e);
    return {};
  }
}

export async function updateTokenPrices() {
  // Проверяем кеш
  if (Date.now() - pricesCacheTime < PRICES_TTL && Object.keys(tokenPrices).length > 0) {
    return tokenPrices;
  }

  const mints = walletTokens.map(t => t.mint);
  if (!mints.length) return tokenPrices;

  const newPrices = await fetchTokenPrices(mints);
  tokenPrices = { ...tokenPrices, ...newPrices };
  pricesCacheTime = Date.now();
  return tokenPrices;
}

export function updateCatalogBalance() {
  const element = document.getElementById('catalogBalance');
  if (!element) return;

  if (!connectedWallet) {
    element.style.display = 'none';
    return;
  }

  element.style.display = 'block';

  const isTon = connectedWallet.type === 'ton';

  if (isTon) {
    // Для TON просто показываем адрес, баланс должен быть получен с TON RPC
    const balanceAmount = document.getElementById('catalogBalanceAmount');
    const balanceTokens = document.getElementById('catalogBalanceTokens');
    
    if (balanceAmount) {
      balanceAmount.textContent = t('ton_wallet');
    }
    
    if (balanceTokens) {
      balanceTokens.textContent = connectedWallet.address.slice(0, 10) + '…';
    }
  } else {
    // Для Phantom (SOL) показываем в USD
    const solPrice = tokenPrices['So11111111111111111111111111111111111111112']?.price || 0;
    let totalValue = solPrice > 0 ? solBalance * solPrice : 0;
    
    walletTokens.forEach(tk => {
      const priceData = tokenPrices[tk.mint];
      if (priceData?.price) {
        totalValue += tk.amount * priceData.price;
      }
    });

    const balanceAmount = document.getElementById('catalogBalanceAmount');
    const balanceTokens = document.getElementById('catalogBalanceTokens');
    
    if (balanceAmount) {
      balanceAmount.textContent = `$${totalValue.toFixed(2)}`;
    }
    
    if (balanceTokens) {
      const tokenCount = walletTokens.length;
      balanceTokens.textContent = `${(solBalance || 0).toFixed(2)} SOL + ${tokenCount} ${tokenCount === 1 ? t('token_singular') : t('token_plural')}`;
    }
  }
}

export function updateProfileBalance() {
  const profileAmount = document.getElementById('profileBalanceAmount');
  const profileDetails = document.getElementById('profileBalanceDetails');
  
  if (!profileAmount || !profileDetails) return;

  if (!connectedWallet) {
    profileAmount.textContent = '$0.00';
    profileDetails.textContent = `0 SOL`;
    return;
  }

  const isTon = connectedWallet.type === 'ton';

  if (isTon) {
    profileAmount.textContent = t('ton_wallet');
    profileDetails.textContent = connectedWallet.address;
  } else {
    // Расчитываем общий баланс для SOL
    const solPrice = tokenPrices['So11111111111111111111111111111111111111112']?.price || 0;
    let totalValue = solPrice > 0 ? solBalance * solPrice : 0;
    
    walletTokens.forEach(tk => {
      const priceData = tokenPrices[tk.mint];
      if (priceData?.price) {
        totalValue += tk.amount * priceData.price;
      }
    });

    profileAmount.textContent = `$${totalValue.toFixed(2)}`;
    
    const tokenCount = walletTokens.length;
    profileDetails.textContent = `${(solBalance || 0).toFixed(2)} SOL + ${tokenCount} ${tokenCount === 1 ? t('token_singular') : t('token_plural')}`;
  }
}

const RPC_URL = 'https://api.mainnet-beta.solana.com';

export async function fetchWalletBalances(address) {
  try {
    const solRes = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'getBalance', params:[address] }),
    });
    const solData = await solRes.json();
    solBalance = (solData.result?.value ?? 0) / 1e9;

    const tokRes = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc:'2.0', id:2,
        method:'getTokenAccountsByOwner',
        params:[
          address,
          { programId:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding:'jsonParsed' },
        ],
      }),
    });
    const tokData = await tokRes.json();
    const accounts = tokData.result?.value ?? [];

    walletTokens = accounts
      .map(a => {
        const info = a.account.data.parsed.info;
        return { mint: info.mint, amount: info.tokenAmount.uiAmount, decimals: info.tokenAmount.decimals };
      })
      .filter(tk => tk.amount > 0);

    // Загружаем цены после получения токенов
    await updateTokenPrices();

    return { sol: solBalance, tokens: walletTokens };
  } catch (e) {
    console.error('[wallet] fetchBalances error:', e);
    return { sol: 0, tokens: [] };
  }
}

// ─── PHANTOM ──────────────────────────────────────────────────────────────────
async function connectPhantom() {
  const phantom = window.solana || window.phantom?.solana;
  if (!phantom?.isPhantom) {
    window.open('https://phantom.app/ul/browse/' + encodeURIComponent(window.location.href), '_blank');
    return null;
  }
  try {
    const resp = await phantom.connect();
    const address = resp.publicKey.toString();
    connectedWallet = { type: 'phantom', address, publicKey: resp.publicKey };
    saveWalletToStorage();
    return connectedWallet;
  } catch (e) {
    console.error('[wallet] phantom connect error:', e);
    return null;
  }
}

async function disconnectPhantom() {
  const phantom = window.solana || window.phantom?.solana;
  if (phantom) await phantom.disconnect().catch(() => {});
  connectedWallet = null;
  saveWalletToStorage();
}

// ─── TON CONNECT ──────────────────────────────────────────────────────────────
// TON подключается только через ввод адреса (без библиотеки)

async function connectTON() {
  // TON подключается только через ввод адреса
  const addr = prompt(t('ton_enter_address'));
  
  if (!addr || addr.trim().length === 0) {
    console.log('[TON] отмена');
    return null;
  }
  
  const trimmed = addr.trim();
  connectedWallet = { type: 'ton', address: trimmed };
  saveWalletToStorage();
  
  const label = document.getElementById('walletLabel');
  const btn   = document.getElementById('walletBtn');
  if (label) label.textContent = trimmed.slice(0,4) + '…' + trimmed.slice(-4);
  if (btn)   { btn.style.borderColor = 'var(--green)'; btn.style.color = 'var(--green)'; }
  
  renderWalletPanel();
  updateCatalogBalance();
  updateProfileBalance();
  
  console.log('[TON] подключен адрес:', trimmed);
  return null;
}

// ─── ПУБЛИЧНЫЙ API ────────────────────────────────────────────────────────────
export async function connectWallet(type = 'phantom') {
  if (type === 'ton') return connectTON();
  return connectPhantom();
}

export async function disconnectWallet() {
  if (connectedWallet?.type === 'phantom') {
    await disconnectPhantom();
  } else if (connectedWallet?.type === 'ton') {
    try { await tonConnectUI?.disconnect(); } catch {}
    connectedWallet = null;
  } else {
    connectedWallet = null;
  }
  saveWalletToStorage();
}

// ─── UI ───────────────────────────────────────────────────────────────────────
export function initWalletUI() {
  const btn   = document.getElementById('walletBtn');
  const label = document.getElementById('walletLabel');

  // Восстанавливаем кошелёк из локального хранилища если есть
  const stored = loadWalletFromStorage();
  if (stored) {
    connectedWallet = stored;
    const short = stored.address.slice(0,4) + '…' + stored.address.slice(-4);
    label.textContent = short;
    btn.style.borderColor = 'var(--green)';
    btn.style.color = 'var(--green)';
    
    if (stored.type === 'phantom') {
      fetchWalletBalances(stored.address).then(() => {
        updateCatalogBalance();
        updateProfileBalance();
        renderWalletPanel();
      });
    } else if (stored.type === 'ton') {
      renderWalletPanel();
    }
  }

  // При смене языка обновляем UI
  onSettingsChange((key) => {
    if (key === 'lang') {
      if (!connectedWallet) {
        label.textContent = t('connect_wallet');
      } else {
        // Если кошелёк подключен, перерендерим баланс с новым языком
        updateCatalogBalance();
        updateProfileBalance();
      }
    }
  });

  async function updateUI() {
    if (connectedWallet) {
      const short = connectedWallet.address.slice(0,4) + '…' + connectedWallet.address.slice(-4);
      label.textContent = short;
      btn.style.borderColor = 'var(--green)';
      btn.style.color = 'var(--green)';

      if (connectedWallet.type === 'phantom') {
        await fetchWalletBalances(connectedWallet.address);
        updateCatalogBalance();
        updateProfileBalance();
        renderWalletPanel();
      }
    } else {
      label.textContent = t('connect_wallet');
      btn.style.borderColor = '';
      btn.style.color = '';
      hideWalletPanel();
    }
  }

  btn.addEventListener('click', async () => {
    if (connectedWallet) {
      const panel = document.getElementById('walletPanel');
      if (panel) { panel.classList.toggle('open'); return; }
      // Обновляем цены перед отображением панели
      await updateTokenPrices();
      renderWalletPanel();
      return;
    }
    const choice = await showWalletChoice();
    if (!choice) return;
    const w = await connectWallet(choice);
    if (w) await updateUI(); // для Phantom; TON приходит через onStatusChange
  });

  // Периодически обновляем цены каждые 2 минуты когда кошелёк подключен
  setInterval(async () => {
    if (connectedWallet?.type === 'phantom' && walletTokens.length > 0) {
      await updateTokenPrices();
      // Обновляем отображение баланса на всех страницах
      updateCatalogBalance();
      updateProfileBalance();
      // Если панель открыта, перерисовываем её
      const panel = document.getElementById('walletPanel');
      if (panel?.classList.contains('open')) {
        renderWalletPanel();
      }
    }
  }, 2 * 60 * 1000);
}

// ─── ДИАЛОГ ВЫБОРА КОШЕЛЬКА ───────────────────────────────────────────────────
function showWalletChoice() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal-card" style="padding:24px 18px 32px">
        <h3 style="font-size:20px;font-weight:700;margin-bottom:18px">${t('wallet_choose')}</h3>
        <button class="primary-btn" id="pickPhantom" style="margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px">
          <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
               style="width:22px;height:22px;border-radius:50%" onerror="this.style.display='none'">
          Phantom (Solana)
        </button>
        <button class="primary-btn" id="pickTon"
          style="background:linear-gradient(135deg,#0098EA,#006bbb);display:flex;align-items:center;justify-content:center;gap:8px">
          <span style="font-size:18px">💎</span> TON Connect
        </button>
        <button id="pickCancel"
          style="display:block;margin:16px auto 0;background:none;border:none;color:var(--ink-3);cursor:pointer;font-size:14px">
          ${t('cancel') || 'Отмена'}
        </button>
      </div>
    `;
    document.getElementById('app').appendChild(overlay);
    const cleanup = val => { overlay.remove(); resolve(val); };
    overlay.querySelector('#pickPhantom').onclick = () => cleanup('phantom');
    overlay.querySelector('#pickTon').onclick     = () => cleanup('ton');
    overlay.querySelector('#pickCancel').onclick  = () => cleanup(null);
    overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(null); });
  });
}

// ─── ПАНЕЛЬ КОШЕЛЬКА ──────────────────────────────────────────────────────────
const TOKEN_META = {
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol:'BONK',    logo:'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I' },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { symbol:'WIF',     logo:'https://bafkreibk3covs5ltyqxa272uodhculbgn2zm52cx3r5nfgg4t32r3ndiyi.ipfs.nftstorage.link' },
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': { symbol:'POPCAT',  logo:'' },
  'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzc8EU': { symbol:'MOODENG', logo:'' },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol:'USDC',    logo:'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
};

export function renderWalletPanel() {
  hideWalletPanel();

  const panel = document.createElement('div');
  panel.id = 'walletPanel';
  panel.className = 'wallet-panel open';

  const isTon = connectedWallet?.type === 'ton';

  // Загружаем цены для всех токенов и SOL
  const tokensHtml = (!isTon && walletTokens.length)
    ? walletTokens.map(tk => {
        const meta   = TOKEN_META[tk.mint] || {};
        const symbol = meta.symbol || tk.mint.slice(0,4) + '…';
        const logo   = meta.logo
          ? `<img src="${meta.logo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'">`
          : `<div style="width:28px;height:28px;border-radius:50%;background:var(--orange);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">${symbol[0]}</div>`;
        
        const priceData = tokenPrices[tk.mint];
        const price = priceData?.price || 0;
        const value = price > 0 ? (tk.amount * price).toFixed(2) : '0.00';
        const priceStr = price > 0.01 ? price.toFixed(4) : price.toExponential(2);
        
        return `
          <div class="wallet-token-row">
            ${logo}
            <div style="flex:1">
              <div class="wallet-token-symbol">${symbol}</div>
              <div style="font-size:11px;color:var(--ink-3);margin-top:2px">${tk.amount.toLocaleString(undefined, { maximumFractionDigits:8 })}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:12px;font-weight:600;color:var(--ink-2)">$${value}</div>
              <div style="font-size:11px;color:var(--ink-3);margin-top:2px">${priceStr}</div>
            </div>
          </div>`;
      }).join('')
    : `<p style="color:var(--ink-3);font-size:13px;padding:4px 0">${t('wallet_no_tokens')}</p>`;

  // Расчитываем SOL цену
  const solPrice = tokenPrices['So11111111111111111111111111111111111111112']?.price || 0;
  const solValue = solPrice > 0 ? (solBalance * solPrice).toFixed(2) : '-';
  const solPriceStr = solPrice > 0 ? solPrice.toFixed(2) : '-';

  // Общая стоимость портфолио
  let portfolioValue = solPrice > 0 ? solBalance * solPrice : 0;
  walletTokens.forEach(tk => {
    const priceData = tokenPrices[tk.mint];
    if (priceData?.price) {
      portfolioValue += tk.amount * priceData.price;
    }
  });
  const portfolioStr = portfolioValue > 0 ? portfolioValue.toFixed(2) : '-';

  const solRow = isTon
    ? `<div class="wallet-sol-row">
        <span style="font-size:28px">💎</span>
        <div>
          <div style="font-weight:700;font-size:16px">TON ${t('wallet_connected') || 'подключён'}</div>
          <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono)">${connectedWallet?.address?.slice(0,8)}…${connectedWallet?.address?.slice(-6)}</div>
        </div>
       </div>`
    : `<div class="wallet-sol-row">
        <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
             style="width:36px;height:36px;border-radius:50%" onerror="this.style.display='none'">
        <div style="flex:1">
          <div style="font-weight:700;font-size:18px;font-family:var(--mono)">${(solBalance ?? 0).toFixed(4)} SOL</div>
          <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono)">${connectedWallet?.address?.slice(0,8)}…${connectedWallet?.address?.slice(-6)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:600;color:var(--ink-2)">$${solValue}</div>
          <div style="font-size:11px;color:var(--ink-3);margin-top:2px">1 SOL = $${solPriceStr}</div>
        </div>
       </div>`;

  panel.innerHTML = `
    <div class="wallet-panel-header">
      <span class="wallet-panel-title">${t('wallet_my') || 'Мой кошелёк'}</span>
      <button class="modal-close" id="walletPanelClose">✕</button>
    </div>
    <div style="background:var(--surface-2);border-radius:var(--radius-sm);padding:12px;margin-bottom:12px;border:1.5px solid var(--border)">
      <div style="font-size:12px;color:var(--ink-3);margin-bottom:4px">${t('wallet_total')}</div>
      <div style="font-size:20px;font-weight:700;color:var(--orange)">$${portfolioStr}</div>
    </div>
    ${solRow}
    <div class="wallet-tokens-title">${t('wallet_tokens')}</div>
    <div class="wallet-tokens-list">${tokensHtml}</div>
    <button class="primary-btn" id="walletDisconnectBtn"
      style="margin-top:14px;background:rgba(239,68,68,.1);color:var(--red);box-shadow:none;border:1.5px solid rgba(239,68,68,.2)">
      ${t('wallet_disconnect')}
    </button>
  `;

  document.getElementById('app').appendChild(panel);

  document.getElementById('walletPanelClose').addEventListener('click', hideWalletPanel);
  document.getElementById('walletDisconnectBtn').addEventListener('click', async () => {
    hideWalletPanel();
    await disconnectWallet();
    const label = document.getElementById('walletLabel');
    const btn   = document.getElementById('walletBtn');
    if (label) label.textContent = t('connect_wallet');
    if (btn)   { btn.style.borderColor = ''; btn.style.color = ''; }
  });
}

export function hideWalletPanel() {
  document.getElementById('walletPanel')?.remove();
}

// ─── ПОДПИСАТЬ ТРАНЗАКЦИЮ ─────────────────────────────────────────────────────
export async function signAndSendTransaction(serializedTx) {
  const phantom = window.solana || window.phantom?.solana;
  if (!phantom) throw new Error('Phantom не найден');

  const txBuf = Uint8Array.from(atob(serializedTx), c => c.charCodeAt(0));
  const { Transaction, VersionedTransaction } = window.solanaWeb3 || {};

  let tx;
  try {
    tx = VersionedTransaction
      ? VersionedTransaction.deserialize(txBuf)
      : Transaction.from(txBuf);
  } catch {
    tx = { serialize: () => txBuf };
  }

  const { signature } = await phantom.signAndSendTransaction(tx);
  return signature;
}
