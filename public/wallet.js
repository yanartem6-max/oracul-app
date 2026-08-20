// wallet.js — TON Connect (Tonkeeper + другие TON кошельки)
import { t, onSettingsChange } from './settings.js?v=5';
import { loadTonConnectUI } from './tonconnect-loader.js';

let tonConnectUI = null;
let connectedWallet = null; // { type: 'ton', address, balance }
let tonBalance = 0; // Нативный TON (для газа)
let gramBalance = 0; // GRAM токен (основной)
let gramPriceUsd = 0; // Курс GRAM в USD

export function getWallet() { return connectedWallet; }
export function getTonBalance() { return tonBalance; }
export function getGramBalance() { return gramBalance; }

// ─── ЛОКАЛЬНОЕ ХРАНИЛИЩЕ ──────────────────────────────────────────────────────
const WALLET_STORAGE_KEY = 'oracul_ton_wallet';

function saveWalletToStorage() {
  if (!connectedWallet) {
    localStorage.removeItem(WALLET_STORAGE_KEY);
    return;
  }
  const data = {
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

// ─── TON CONNECT ИНИЦИАЛИЗАЦИЯ ────────────────────────────────────────────────
async function initTonConnect() {
  if (tonConnectUI) return tonConnectUI;

  try {
    // Загружаем TON Connect UI через loader
    const TonConnectUI = await loadTonConnectUI();
    
    if (!TonConnectUI) {
      console.error('[TON Connect] TonConnectUI not loaded from CDN');
      alert('Ошибка загрузки TON Connect. Обновите страницу.');
      return null;
    }

    tonConnectUI = new TonConnectUI({
      manifestUrl: 'https://oracul.vercel.app/tonconnect-manifest.json',
      buttonRootId: null, // не используем встроенную кнопку
    });

    console.log('[TON Connect] Initialized successfully');

    // Слушаем изменения статуса подключения
    tonConnectUI.onStatusChange((wallet) => {
      if (wallet) {
        const address = wallet.account.address;
        connectedWallet = {
          type: 'ton',
          address: address,
          balance: 0,
        };
        saveWalletToStorage();
        console.log('[TON Connect] подключён:', address);
        
        // Обновляем UI
        updateWalletUI();
        fetchGramBalance(address); // Получаем баланс GRAM токена
      } else {
        console.log('[TON Connect] отключён');
        connectedWallet = null;
        tonBalance = 0;
        gramBalance = 0;
        saveWalletToStorage();
        updateWalletUI();
      }
    });

    return tonConnectUI;
  } catch (e) {
    console.error('[TON Connect] ошибка инициализации:', e);
    alert('Ошибка инициализации TON Connect: ' + e.message);
    return null;
  }
}

// ─── БАЛАНС GRAM ТОКЕНА ───────────────────────────────────────────────────────
// GRAM - это отдельный Jetton токен в сети TON, не нативный TON
const GRAM_CONTRACT = 'EQBDanbCeUqI4_v7HXq8to7mOcWCzd8R0S0fcLC5-OS_jUva'; // GRAM Jetton master contract

async function fetchGramBalance(address) {
  try {
    // Получаем баланс GRAM токена через TON API
    const response = await fetch(`https://tonapi.io/v2/accounts/${address}/jettons`);
    const data = await response.json();
    
    if (data && data.balances) {
      // Ищем GRAM токен в списке Jettons
      const gramToken = data.balances.find(token => 
        token.jetton?.address === GRAM_CONTRACT ||
        token.jetton?.symbol?.toUpperCase() === 'GRAM'
      );
      
      if (gramToken) {
        // Баланс в минимальных единицах, конвертируем (обычно 9 decimals для GRAM)
        const decimals = gramToken.jetton?.decimals || 9;
        gramBalance = parseFloat(gramToken.balance) / Math.pow(10, decimals);
        
        console.log('[GRAM] баланс:', gramBalance, 'GRAM');
      } else {
        // Если GRAM не найден, баланс 0
        gramBalance = 0;
        console.log('[GRAM] токен не найден в кошельке');
      }
    }
    
    // Получаем курс GRAM
    await fetchGramPrice();
    
    // Также получаем нативный TON для информации
    await fetchNativeTonBalance(address);
    
    if (connectedWallet) {
      connectedWallet.balance = gramBalance;
      connectedWallet.gramBalance = gramBalance;
      connectedWallet.tonBalance = tonBalance;
    }
    
    updateCatalogBalance();
    updateProfileBalance();
  } catch (e) {
    console.error('[GRAM] ошибка получения баланса:', e);
    // Fallback: пробуем альтернативный метод
    await fetchGramBalanceFallback(address);
  }
}

// Альтернативный метод через toncenter
async function fetchGramBalanceFallback(address) {
  try {
    const response = await fetch(`https://toncenter.com/api/v2/getTokenData?address=${GRAM_CONTRACT}`);
    const data = await response.json();
    
    // Это упрощённый fallback, показываем 0 если не удалось
    gramBalance = 0;
    console.log('[GRAM] Fallback: не удалось получить баланс GRAM');
  } catch (e) {
    console.error('[GRAM] Fallback error:', e);
  }
}

// Получаем нативный TON баланс (для газа)
async function fetchNativeTonBalance(address) {
  try {
    const response = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`);
    const data = await response.json();
    
    if (data.ok && data.result) {
      // Нативный TON (для газа)
      tonBalance = parseInt(data.result) / 1e9;
      console.log('[TON] нативный баланс (для газа):', tonBalance, 'TON');
    }
  } catch (e) {
    console.error('[TON] ошибка получения нативного баланса:', e);
  }
}

// Получаем курс GRAM
async function fetchGramPrice() {
  try {
    // Пробуем получить цену GRAM с CoinGecko или другого источника
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=gram&vs_currencies=usd');
    const data = await response.json();
    
    if (data && data.gram && data.gram.usd) {
      gramPriceUsd = data.gram.usd;
      console.log('[GRAM] курс:', gramPriceUsd, 'USD');
    } else {
      // Fallback: примерный курс GRAM
      gramPriceUsd = 0.05; // примерно $0.05, нужно обновить актуальным
      console.log('[GRAM] используем примерный курс:', gramPriceUsd, 'USD');
    }
  } catch (e) {
    console.error('[GRAM] ошибка получения курса:', e);
    gramPriceUsd = 0.05; // fallback
  }
}

// ─── ПОДКЛЮЧЕНИЕ/ОТКЛЮЧЕНИЕ ───────────────────────────────────────────────────
export async function connectWallet() {
  const ui = await initTonConnect();
  
  if (!ui) {
    alert('Не удалось инициализировать TON Connect. Перезагрузите страницу.');
    return;
  }
  
  try {
    await ui.openModal();
    console.log('[TON Connect] Modal opened');
  } catch (e) {
    console.error('[TON Connect] ошибка подключения:', e);
    alert('Ошибка подключения кошелька: ' + e.message);
  }
}

export async function disconnectWallet() {
  if (tonConnectUI) {
    try {
      await tonConnectUI.disconnect();
    } catch (e) {
      console.error('[TON Connect] ошибка отключения:', e);
    }
  }
  
  connectedWallet = null;
  tonBalance = 0;
  gramBalance = 0;
  gramPriceUsd = 0;
  saveWalletToStorage();
  updateWalletUI();
}

// ─── ОБНОВЛЕНИЕ UI ────────────────────────────────────────────────────────────
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
    balanceAmount.textContent = `${gramBalance.toFixed(2)} GRAM`;
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

  profileAmount.textContent = `${gramBalance.toFixed(4)} GRAM`;
  profileDetails.textContent = connectedWallet.address;
}

// ─── ИНИЦИАЛИЗАЦИЯ UI ─────────────────────────────────────────────────────────
export async function initWalletUI() {
  // Инициализируем TON Connect
  await initTonConnect();
  
  const btn = document.getElementById('walletBtn');
  const label = document.getElementById('walletLabel');

  if (!btn || !label) return;

  // Восстанавливаем из хранилища
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
      fetchGramBalance(currentWallet.account.address);
    }
  }

  // При смене языка обновляем UI
  onSettingsChange((key) => {
    if (key === 'lang') {
      updateWalletUI();
    }
  });

  // Клик по кнопке кошелька
  btn.addEventListener('click', async () => {
    if (connectedWallet) {
      // Если подключён - показываем панель или обновляем баланс
      const panel = document.getElementById('walletPanel');
      if (panel) {
        panel.classList.toggle('open');
        return;
      }
      await fetchGramBalance(connectedWallet.address);
      renderWalletPanel();
    } else {
      // Если не подключён - открываем модальное окно подключения
      await connectWallet();
    }
  });

  // Периодически обновляем баланс каждые 30 секунд
  setInterval(async () => {
    if (connectedWallet) {
      await fetchGramBalance(connectedWallet.address);
    }
  }, 30000);
}

// ─── ПАНЕЛЬ КОШЕЛЬКА ──────────────────────────────────────────────────────────
export function renderWalletPanel() {
  hideWalletPanel();

  const panel = document.createElement('div');
  panel.id = 'walletPanel';
  panel.className = 'wallet-panel open';

  // Рассчитываем USD стоимость GRAM
  const balanceUsd = (gramBalance * gramPriceUsd).toFixed(2);
  const tonBalanceUsd = (tonBalance * 5.5).toFixed(2); // TON примерно $5.5

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
        <div style="font-weight:700;font-size:18px;font-family:var(--mono)">${gramBalance.toFixed(4)} GRAM</div>
        <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono)">${connectedWallet.address.slice(0, 8)}…${connectedWallet.address.slice(-6)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px;font-weight:600;color:var(--ink-2)">$${balanceUsd}</div>
        <div style="font-size:11px;color:var(--ink-3);margin-top:2px">1 GRAM ≈ $${gramPriceUsd.toFixed(4)}</div>
      </div>
    </div>
    
    ${tonBalance > 0 ? `
    <div style="background:var(--surface-2);border-radius:var(--radius-sm);padding:10px;margin:8px 0;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:12px;color:var(--ink-3)">TON (для газа)</div>
          <div style="font-weight:600;font-size:14px;font-family:var(--mono)">${tonBalance.toFixed(4)} TON</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;color:var(--ink-2)">$${tonBalanceUsd}</div>
        </div>
      </div>
    </div>
    ` : ''}
    
    <div style="background:var(--orange-lt);border-radius:var(--radius-sm);padding:10px;margin:12px 0;border-left:3px solid var(--orange)">
      <div style="font-size:12px;color:var(--ink-2)">
        💡 ${t('ton_wallet_info') || 'GRAM - отдельный токен в сети TON. Используйте Tonkeeper или MyTonWallet для swap GRAM → SOL.'}
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

// ─── ОТПРАВКА GRAM (TON) ТРАНЗАКЦИИ ───────────────────────────────────────────
export async function sendTonTransaction(toAddress, amountTon, payload = '') {
  if (!tonConnectUI || !connectedWallet) {
    throw new Error('TON кошелёк не подключён');
  }

  try {
    // Конвертируем GRAM в nanotons (1 GRAM = 10^9 nanotons)
    const amountNano = Math.floor(amountTon * 1e9).toString();

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 360, // 6 минут
      messages: [
        {
          address: toAddress,
          amount: amountNano,
          payload: payload || undefined,
        },
      ],
    };

    const result = await tonConnectUI.sendTransaction(transaction);
    console.log('[TON] транзакция отправлена:', result);
    
    // Обновляем баланс после отправки
    setTimeout(() => {
      if (connectedWallet) {
        fetchTonBalance(connectedWallet.address);
      }
    }, 3000);

    return result;
  } catch (e) {
    console.error('[TON] ошибка отправки транзакции:', e);
    throw e;
  }
}

// ─── ЭКСПОРТ ДЛЯ СОВМЕСТИМОСТИ ────────────────────────────────────────────────
export function getWalletTokens() { return []; } // TON токены будут позже
export function getSolBalance() { return 0; } // больше не используем SOL
export function getTokenPrices() { return {}; }
export async function updateTokenPrices() { return {}; }
export async function fetchWalletBalances() { return { sol: 0, tokens: [] }; }
export async function signAndSendTransaction() { throw new Error('Используйте sendTonTransaction для TON'); }
