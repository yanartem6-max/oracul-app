// wallet.js — TON Connect для Gram Wallet
import { t, onSettingsChange } from './settings.js?v=5';
import { loadTonConnectUI } from './tonconnect-loader.js';

let tonConnectUI = null;
let connectedWallet = null;
let nativeTonBalance = 0; // Нативный TON (в Gram Wallet отображается как GRAM)
let tonPriceUsd = 0;

export function getWallet() { return connectedWallet; }
export function getGramBalance() { return nativeTonBalance; }
export function getTonBalance() { return nativeTonBalance; }

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const WALLET_STORAGE_KEY = 'oracul_ton_wallet';

function saveWalletToStorage() {
  if (!connectedWallet) {
    localStorage.removeItem(WALLET_STORAGE_KEY);
    return;
  }
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({
    address: connectedWallet.address,
    timestamp: Date.now(),
  }));
}

function loadWalletFromStorage() {
  try {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// ─── TON CONNECT ──────────────────────────────────────────────────────────────
async function initTonConnect() {
  if (tonConnectUI) return tonConnectUI;

  try {
    const TonConnectUI = await loadTonConnectUI();
    
    if (!TonConnectUI) {
      console.error('[Wallet] TonConnectUI не загружен');
      return null;
    }

    tonConnectUI = new TonConnectUI({
      manifestUrl: 'https://oracul.vercel.app/tonconnect-manifest.json',
      buttonRootId: null,
    });

    console.log('[Wallet] TON Connect инициализирован');

    tonConnectUI.onStatusChange((wallet) => {
      if (wallet) {
        const address = wallet.account.address;
        connectedWallet = {
          type: 'ton',
          address: address,
          balance: 0,
        };
        
        console.log('[Wallet] ✅ Подключён:', address);
        saveWalletToStorage();
        updateWalletUI();
        fetchBalance(address);
      } else {
        console.log('[Wallet] Отключён');
        connectedWallet = null;
        nativeTonBalance = 0;
        tonPriceUsd = 0;
        saveWalletToStorage();
        updateWalletUI();
      }
    });

    return tonConnectUI;
  } catch (e) {
    console.error('[Wallet] Ошибка инициализации:', e);
    return null;
  }
}

// ─── BALANCE ──────────────────────────────────────────────────────────────────
async function fetchBalance(address) {
  console.log('[Balance] Получаем баланс для:', address);
  
  try {
    // Получаем нативный TON
    const response = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`);
    const data = await response.json();
    
    if (data.ok && data.result) {
      nativeTonBalance = parseInt(data.result) / 1e9;
      console.log('[Balance] ✅ TON получен:', nativeTonBalance);
    } else {
      console.error('[Balance] ❌ Ошибка от API:', data);
      nativeTonBalance = 0;
    }
    
    // Получаем курс TON
    await fetchTonPrice();
    
    // Обновляем кошелёк
    if (connectedWallet) {
      connectedWallet.balance = nativeTonBalance;
    }
    
    console.log('[Balance] ИТОГО:', nativeTonBalance, 'TON @', tonPriceUsd, 'USD =', (nativeTonBalance * tonPriceUsd).toFixed(2), 'USD');
    
    // Обновляем UI
    updateCatalogBalance();
    updateProfileBalance();
    
  } catch (e) {
    console.error('[Balance] ❌ Критическая ошибка:', e);
    nativeTonBalance = 0;
    updateCatalogBalance();
    updateProfileBalance();
  }
}

async function fetchTonPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
    const data = await response.json();
    
    if (data && data['the-open-network'] && data['the-open-network'].usd) {
      tonPriceUsd = data['the-open-network'].usd;
      console.log('[Price] ✅ TON price:', tonPriceUsd, 'USD');
    } else {
      tonPriceUsd = 5.5; // fallback
      console.log('[Price] ⚠️ Используем fallback:', tonPriceUsd, 'USD');
    }
  } catch (e) {
    console.error('[Price] ❌ Ошибка:', e);
    tonPriceUsd = 5.5; // fallback
  }
}

// ─── CONNECT/DISCONNECT ───────────────────────────────────────────────────────
export async function connectWallet() {
  const ui = await initTonConnect();
  if (!ui) {
    alert('Ошибка инициализации TON Connect');
    return;
  }
  
  try {
    await ui.openModal();
  } catch (e) {
    console.error('[Wallet] Ошибка подключения:', e);
  }
}

export async function disconnectWallet() {
  if (tonConnectUI) {
    try {
      await tonConnectUI.disconnect();
    } catch (e) {
      console.error('[Wallet] Ошибка отключения:', e);
    }
  }
  
  connectedWallet = null;
  nativeTonBalance = 0;
  tonPriceUsd = 0;
  saveWalletToStorage();
  updateWalletUI();
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function updateWalletUI() {
  const btn = document.getElementById('walletBtn');
  const label = document.getElementById('walletLabel');
  
  if (!btn || !label) return;
  
  if (connectedWallet) {
    const short = connectedWallet.address.slice(0, 4) + '…' + connectedWallet.address.slice(-4);
    label.textContent = short;
    btn.style.borderColor = 'var(--green)';
    btn.style.color = 'var(--green)';
  } else {
    label.textContent = t('connect_wallet');
    btn.style.borderColor = '';
    btn.style.color = '';
    hideWalletPanel();
  }
  
  updateCatalogBalance();
  updateProfileBalance();
}

export function updateCatalogBalance() {
  const element = document.getElementById('catalogBalance');
  if (!element) return;

  if (!connectedWallet) {
    element.style.display = 'none';
    return;
  }

  element.style.display = 'block';

  const balanceAmount = document.getElementById('catalogBalanceAmount');
  const balanceTokens = document.getElementById('catalogBalanceTokens');
  
  if (balanceAmount) {
    balanceAmount.textContent = `${nativeTonBalance.toFixed(2)} GRAM`;
  }
  
  if (balanceTokens) {
    balanceTokens.textContent = connectedWallet.address.slice(0, 8) + '…' + connectedWallet.address.slice(-6);
  }
}

export function updateProfileBalance() {
  const profileAmount = document.getElementById('profileBalanceAmount');
  const profileDetails = document.getElementById('profileBalanceDetails');
  
  if (!profileAmount || !profileDetails) return;

  if (!connectedWallet) {
    profileAmount.textContent = '0 GRAM';
    profileDetails.textContent = t('wallet_not_connected') || 'Кошелёк не подключён';
    return;
  }

  profileAmount.textContent = `${nativeTonBalance.toFixed(4)} GRAM`;
  profileDetails.textContent = connectedWallet.address;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
export async function initWalletUI() {
  await initTonConnect();
  
  const btn = document.getElementById('walletBtn');
  if (!btn) return;

  // Восстановление из storage
  const stored = loadWalletFromStorage();
  if (stored && tonConnectUI) {
    const currentWallet = tonConnectUI.wallet;
    if (currentWallet) {
      connectedWallet = {
        type: 'ton',
        address: currentWallet.account.address,
        balance: 0,
      };
      updateWalletUI();
      fetchBalance(currentWallet.account.address);
    }
  }

  // Смена языка
  onSettingsChange((key) => {
    if (key === 'lang') updateWalletUI();
  });

  // Клик по кнопке
  btn.addEventListener('click', async () => {
    if (connectedWallet) {
      const panel = document.getElementById('walletPanel');
      if (panel) {
        panel.classList.toggle('open');
        return;
      }
      renderWalletPanel();
    } else {
      await connectWallet();
    }
  });

  // Авто-обновление каждые 30 секунд
  setInterval(async () => {
    if (connectedWallet) {
      await fetchBalance(connectedWallet.address);
    }
  }, 30000);
}

// ─── PANEL ────────────────────────────────────────────────────────────────────
export function renderWalletPanel() {
  hideWalletPanel();

  const panel = document.createElement('div');
  panel.id = 'walletPanel';
  panel.className = 'wallet-panel open';

  const balanceUsd = (nativeTonBalance * tonPriceUsd).toFixed(2);

  panel.innerHTML = `
    <div class="wallet-panel-header">
      <span class="wallet-panel-title">${t('wallet_my') || 'Мой кошелёк'}</span>
      <button class="modal-close" id="walletPanelClose">✕</button>
    </div>
    
    <div style="background:var(--surface-2);border-radius:var(--radius-sm);padding:12px;margin-bottom:12px;border:1.5px solid var(--border)">
      <div style="font-size:12px;color:var(--ink-3);margin-bottom:4px">${t('wallet_total') || 'Общий баланс'}</div>
      <div style="font-size:20px;font-weight:700;color:var(--orange)">≈ $${balanceUsd}</div>
    </div>
    
    <div class="wallet-sol-row">
      <span style="font-size:36px">💎</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:18px;font-family:var(--mono)">${nativeTonBalance.toFixed(4)} GRAM</div>
        <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono)">${connectedWallet.address.slice(0, 8)}…${connectedWallet.address.slice(-6)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px;font-weight:600;color:var(--ink-2)">$${balanceUsd}</div>
        <div style="font-size:11px;color:var(--ink-3);margin-top:2px">1 GRAM ≈ $${tonPriceUsd.toFixed(2)}</div>
      </div>
    </div>
    
    <div style="background:var(--orange-lt);border-radius:var(--radius-sm);padding:10px;margin:12px 0;border-left:3px solid var(--orange)">
      <div style="font-size:12px;color:var(--ink-2)">
        💡 В Gram Wallet нативный TON отображается как GRAM
      </div>
    </div>
    
    <button class="primary-btn" id="walletDisconnectBtn"
      style="margin-top:14px;background:rgba(239,68,68,.1);color:var(--red);box-shadow:none;border:1.5px solid rgba(239,68,68,.2)">
      ${t('wallet_disconnect') || 'Отключить кошелёк'}
    </button>
  `;

  document.getElementById('app').appendChild(panel);

  document.getElementById('walletPanelClose').addEventListener('click', hideWalletPanel);
  document.getElementById('walletDisconnectBtn').addEventListener('click', async () => {
    hideWalletPanel();
    await disconnectWallet();
  });
}

export function hideWalletPanel() {
  document.getElementById('walletPanel')?.remove();
}

// ─── TRANSACTION ──────────────────────────────────────────────────────────────
export async function sendTonTransaction(toAddress, amountTon, payload = '') {
  if (!tonConnectUI || !connectedWallet) {
    throw new Error('Кошелёк не подключён');
  }

  const amountNano = Math.floor(amountTon * 1e9).toString();

  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 360,
    messages: [{
      address: toAddress,
      amount: amountNano,
      payload: payload || undefined,
    }],
  };

  const result = await tonConnectUI.sendTransaction(transaction);
  
  setTimeout(() => {
    if (connectedWallet) fetchBalance(connectedWallet.address);
  }, 3000);

  return result;
}

// ─── COMPATIBILITY ────────────────────────────────────────────────────────────
export function getWalletTokens() { return []; }
export function getSolBalance() { return 0; }
export function getTokenPrices() { return {}; }
export async function updateTokenPrices() { return {}; }
export async function fetchWalletBalances() { return { sol: 0, tokens: [] }; }
export async function signAndSendTransaction() { throw new Error('Используйте sendTonTransaction'); }
