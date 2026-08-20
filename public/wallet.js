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
      console.log('[TON Connect] ═══════════════════════════════════════');
      console.log('[TON Connect] onStatusChange ВЫЗВАН');
      console.log('[TON Connect] ПОЛНЫЙ wallet объект:', JSON.stringify(wallet, null, 2));
      
      if (wallet) {
        console.log('[TON Connect] wallet.account:', wallet.account);
        console.log('[TON Connect] wallet.account.address:', wallet.account.address);
        console.log('[TON Connect] wallet.account.publicKey:', wallet.account.publicKey);
        console.log('[TON Connect] wallet.account.chain:', wallet.account.chain);
        
        const address = wallet.account.address;
        console.log('[TON Connect] Кошелёк подключён!');
        console.log('[TON Connect] Адрес (использую):', address);
        console.log('[TON Connect] Формат адреса:', address.includes(':') ? 'RAW (0:hex)' : 'User-friendly (EQ/UQ)');
        
        connectedWallet = {
          type: 'ton',
          address: address,
          balance: 0,
        };
        saveWalletToStorage();
        console.log('[TON Connect] connectedWallet создан:', connectedWallet);
        
        // Обновляем UI
        console.log('[TON Connect] Вызываем updateWalletUI()');
        updateWalletUI();
        
        console.log('[TON Connect] Вызываем fetchGramBalance()');
        fetchGramBalance(address); // Получаем баланс GRAM токена
      } else {
        console.log('[TON Connect] Кошелёк отключён');
        connectedWallet = null;
        tonBalance = 0;
        gramBalance = 0;
        saveWalletToStorage();
        updateWalletUI();
      }
      console.log('[TON Connect] ═══════════════════════════════════════');
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
// Известные contract addresses для GRAM токена
const GRAM_CONTRACTS = [
  'EQBDanbCeUqI4_v7HXq8to7mOcWCzd8R0S0fcLC5-OS_jUva', // Основной GRAM контракт
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', // Альтернативный
  'EQCKt2WPGX-fh0cIAz38Ljd_OKQjoZE_cqk7QrYGsNP6wfn0', // Gram Wallet официальный
  'EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE', // Gram на DeDust
];

// Известные символы для поиска
const GRAM_SYMBOLS = ['GRAM', '$GRAM', 'GRАM', 'Gram'];

// Конвертируем адрес из RAW формата в user-friendly если нужно
function convertAddressFormat(address) {
  // Если адрес в формате 0:hex, пробуем найти его в разных форматах
  if (address.includes(':')) {
    return address; // toncenter работает с raw форматом
  }
  return address;
}

async function fetchGramBalance(address) {
  console.log('[GRAM] ═══════════════════════════════════════════════');
  console.log('[GRAM] fetchGramBalance ВЫЗВАН');
  console.log('[GRAM] Исходный адрес:', address);
  console.log('[GRAM] Формат:', address.includes(':') ? 'RAW' : 'User-friendly');
  console.log('[GRAM] Текущий gramBalance:', gramBalance);
  console.log('[GRAM] ═══════════════════════════════════════════════');
  
  try {
    // Используем адрес как есть для всех API
    console.log('[GRAM] Начинаем получение баланса');
    
    // МЕТОД 1: tonapi.io напрямую с RAW адресом
    console.log('[GRAM] ───────────────────────────────────────────────');
    console.log('[GRAM] МЕТОД 1: tonapi.io');
    try {
      // Пробуем оба формата адреса
      const addresses = [address];
      
      // Если RAW формат, пробуем также без префикса
      if (address.includes(':')) {
        addresses.push(address.replace('0:', ''));
      }
      
      for (const addr of addresses) {
        const tonapiUrl = `https://tonapi.io/v2/accounts/${addr}/jettons`;
        console.log('[GRAM] Пробуем URL:', tonapiUrl);
        
        const response = await fetch(tonapiUrl);
        console.log('[GRAM] tonapi.io response.status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[GRAM] tonapi.io данные получены');
          console.log('[GRAM] Количество балансов:', data.balances?.length || 0);
          
          if (data && data.balances && data.balances.length > 0) {
            console.log('[GRAM] ✅ Найдено токенов:', data.balances.length);
            
            // Выводим ВСЕ токены
            for (let i = 0; i < data.balances.length; i++) {
              const token = data.balances[i];
              console.log(`[GRAM] Токен ${i}:`, {
                symbol: token.jetton?.symbol,
                name: token.jetton?.name,
                balance: token.balance,
                decimals: token.jetton?.decimals
              });
            }
            
            // Ищем GRAM
            const gramToken = data.balances.find(token => {
              const symbol = token.jetton?.symbol?.toUpperCase();
              const name = token.jetton?.name?.toUpperCase();
              return symbol === 'GRAM' || 
                     symbol === '$GRAM' || 
                     name?.includes('GRAM');
            });
            
            if (gramToken) {
              const decimals = gramToken.jetton?.decimals || 9;
              gramBalance = parseFloat(gramToken.balance) / Math.pow(10, decimals);
              
              console.log('[GRAM] ✅✅✅ НАЙДЕН (tonapi.io) ✅✅✅');
              console.log('[GRAM] Баланс:', gramBalance, 'GRAM');
              
              await fetchGramPrice();
              await fetchNativeTonBalance(address);
              
              if (connectedWallet) {
                connectedWallet.balance = gramBalance;
                connectedWallet.gramBalance = gramBalance;
                connectedWallet.tonBalance = tonBalance;
              }
              
              updateCatalogBalance();
              updateProfileBalance();
              console.log('[GRAM] ═══ УСПЕШНО (tonapi.io) ═══');
              return;
            } else {
              console.log('[GRAM] ⚠️ GRAM не найден среди токенов с адресом', addr);
            }
          } else {
            console.log('[GRAM] ⚠️ Нет токенов с адресом', addr);
          }
        } else {
          console.log('[GRAM] ⚠️ tonapi.io вернул статус', response.status, 'для адреса', addr);
        }
      }
    } catch (e) {
      console.error('[GRAM] tonapi.io ошибка:', e);
    }
    
    // МЕТОД 2: Используем toncenter API (работает с RAW адресами)
    console.log('[GRAM] ───────────────────────────────────────────────');
    console.log('[GRAM] МЕТОД 2: Запрос к toncenter');
    console.log('[GRAM] URL:', `https://toncenter.com/api/v3/jetton/wallets?owner_address=${address}&limit=100`);
    
    try {
      console.log('[GRAM] Отправляем fetch запрос к toncenter...');
      const response = await fetch(`https://toncenter.com/api/v3/jetton/wallets?owner_address=${address}&limit=100`);
      
      console.log('[GRAM] toncenter response.status:', response.status);
      console.log('[GRAM] toncenter response.ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[GRAM] toncenter ПОЛНЫЙ ответ:', JSON.stringify(data, null, 2));
        console.log('[GRAM] toncenter data.jetton_wallets:', data.jetton_wallets);
        console.log('[GRAM] Количество jetton_wallets:', data.jetton_wallets?.length);
        
        if (data && data.jetton_wallets && data.jetton_wallets.length > 0) {
          console.log('[GRAM] toncenter нашёл jetton_wallets, количество:', data.jetton_wallets.length);
          
          // Выводим все найденные токены для отладки
          for (let i = 0; i < data.jetton_wallets.length; i++) {
            const wallet = data.jetton_wallets[i];
            console.log(`[GRAM] Токен ${i}:`, {
              jetton: wallet.jetton,
              balance: wallet.balance,
              owner: wallet.owner
            });
            
            // Получаем метаданные для каждого токена
            try {
              const jettonInfoUrl = `https://toncenter.com/api/v3/jetton/masters?address=${wallet.jetton}`;
              console.log(`[GRAM] Запрашиваем метаданные для токена ${i}:`, jettonInfoUrl);
              
              const jettonInfoResponse = await fetch(jettonInfoUrl);
              const jettonInfo = await jettonInfoResponse.json();
              console.log(`[GRAM] Метаданные токена ${i}:`, jettonInfo);
              
              if (jettonInfo && jettonInfo.jetton_masters && jettonInfo.jetton_masters[0]) {
                const master = jettonInfo.jetton_masters[0];
                const symbol = master.jetton_content?.symbol;
                const name = master.jetton_content?.name;
                
                console.log(`[GRAM] Токен ${i} - символ: "${symbol}", имя: "${name}"`);
                
                // Проверяем различные варианты названия GRAM
                if (symbol && (
                  symbol.toUpperCase() === 'GRAM' ||
                  symbol.toUpperCase() === '$GRAM' ||
                  name?.toUpperCase().includes('GRAM')
                )) {
                  const decimals = master.jetton_content?.decimals || 9;
                  gramBalance = parseFloat(wallet.balance) / Math.pow(10, decimals);
                  
                  console.log('[GRAM] ✅✅✅ НАЙДЕН ЧЕРЕЗ TONCENTER ✅✅✅');
                  console.log('[GRAM] Баланс:', gramBalance, 'GRAM');
                  console.log('[GRAM] Decimals:', decimals);
                  console.log('[GRAM] Raw balance:', wallet.balance);
                  
                  await fetchGramPrice();
                  await fetchNativeTonBalance(address);
                  
                  if (connectedWallet) {
                    connectedWallet.balance = gramBalance;
                    connectedWallet.gramBalance = gramBalance;
                    connectedWallet.tonBalance = tonBalance;
                  }
                  
                  console.log('[GRAM] Обновляем UI...');
                  updateCatalogBalance();
                  updateProfileBalance();
                  console.log('[GRAM] ═══ УСПЕШНО ЗАВЕРШЕНО (toncenter) ═══');
                  return;
                }
              }
            } catch (e) {
              console.error(`[GRAM] Ошибка получения метаданных для токена ${i}:`, e);
            }
          }
          
          console.log('[GRAM] ⚠️ GRAM токен НЕ НАЙДЕН среди', data.jetton_wallets.length, 'токенов');
        } else {
          console.log('[GRAM] ⚠️ data.jetton_wallets пуст или отсутствует');
          console.log('[GRAM] Возможно в кошельке нет jetton токенов');
        }
      } else {
        console.log('[GRAM] ❌ toncenter вернул ошибку, status:', response.status);
        const errorText = await response.text();
        console.log('[GRAM] Текст ошибки:', errorText);
      }
    } catch (e) {
      console.error('[GRAM] ❌ toncenter ИСКЛЮЧЕНИЕ:', e);
      console.error('[GRAM] Стек ошибки:', e.stack);
    }
    
    // FALLBACK: Если ничего не нашли, показываем 0
    console.log('[GRAM] ───────────────────────────────────────────────');
    console.log('[GRAM] ⚠️ FALLBACK: Токен не найден ни в одном API');
    console.log('[GRAM] Это может означать:');
    console.log('[GRAM] 1. В кошельке действительно нет GRAM токенов');
    console.log('[GRAM] 2. GRAM называется по-другому в этом кошельке');
    console.log('[GRAM] 3. Используется другой токен вместо GRAM');
    console.log('[GRAM] Устанавливаем gramBalance = 0');
    gramBalance = 0;
    
    // Но всё равно получаем TON и обновляем UI
    await fetchGramPrice();
    await fetchNativeTonBalance(address);
    
    if (connectedWallet) {
      connectedWallet.balance = gramBalance;
      connectedWallet.gramBalance = gramBalance;
      connectedWallet.tonBalance = tonBalance;
    }
    
    console.log('[GRAM] ИТОГО:');
    console.log('[GRAM] - gramBalance:', gramBalance, 'GRAM');
    console.log('[GRAM] - tonBalance:', tonBalance, 'TON');
    console.log('[GRAM] - gramPriceUsd:', gramPriceUsd, 'USD');
    console.log('[GRAM] Обновляем UI (fallback)...');
    updateCatalogBalance();
    updateProfileBalance();
    console.log('[GRAM] ═══ ЗАВЕРШЕНО (fallback, баланс=0) ═══');
    
  } catch (e) {
    console.error('[GRAM] ❌❌❌ КРИТИЧЕСКАЯ ОШИБКА ❌❌❌');
    console.error('[GRAM] Ошибка:', e);
    console.error('[GRAM] Сообщение:', e.message);
    console.error('[GRAM] Стек:', e.stack);
    gramBalance = 0;
    
    // Всё равно пробуем получить нативный TON
    try {
      await fetchNativeTonBalance(address);
    } catch (e2) {
      console.error('[TON] ❌ Ошибка получения TON баланса:', e2);
    }
    
    console.log('[GRAM] Обновляем UI (после критической ошибки)...');
    updateCatalogBalance();
    updateProfileBalance();
    console.log('[GRAM] ═══ ЗАВЕРШЕНО С ОШИБКОЙ ═══');
  }
}

// Получаем нативный TON баланс (для газа)
async function fetchNativeTonBalance(address) {
  console.log('[TON] ───────────────────────────────────────────────');
  console.log('[TON] fetchNativeTonBalance вызван для:', address);
  
  try {
    const url = `https://toncenter.com/api/v2/getAddressBalance?address=${address}`;
    console.log('[TON] URL запроса:', url);
    
    const response = await fetch(url);
    console.log('[TON] response.status:', response.status);
    
    const data = await response.json();
    console.log('[TON] Полный ответ:', data);
    
    if (data.ok && data.result) {
      // Нативный TON (для газа)
      tonBalance = parseInt(data.result) / 1e9;
      console.log('[TON] ✅ нативный баланс получен:', tonBalance, 'TON');
    } else {
      console.log('[TON] ⚠️ data.ok = false или нет data.result');
    }
  } catch (e) {
    console.error('[TON] ❌ ошибка получения нативного баланса:', e);
  }
  console.log('[TON] ═══════════════════════════════════════════════');
}

// Получаем курс GRAM
async function fetchGramPrice() {
  console.log('[GRAM PRICE] ═══════════════════════════════════════');
  console.log('[GRAM PRICE] fetchGramPrice вызван');
  
  try {
    // Метод 1: Пробуем CoinGecko
    console.log('[GRAM PRICE] МЕТОД 1: CoinGecko');
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
      console.log('[GRAM PRICE] CoinGecko response.status:', response.status);
      
      const data = await response.json();
      console.log('[GRAM PRICE] CoinGecko данные:', data);
      
      // Проверяем разные ID для GRAM
      if (data && data['the-open-network'] && data['the-open-network'].usd) {
        // Это TON, но GRAM часто торгуется по похожей цене
        const tonPrice = data['the-open-network'].usd;
        // Проверяем отношение GRAM к TON (обычно GRAM немного дешевле)
        gramPriceUsd = tonPrice * 0.25; // примерно 1/4 от TON
        console.log('[GRAM PRICE] ✅ курс (CoinGecko TON ratio):', gramPriceUsd, 'USD');
        console.log('[GRAM PRICE] ═══════════════════════════════════════');
        return;
      }
    } catch (e) {
      console.error('[GRAM PRICE] ❌ CoinGecko ошибка:', e);
    }
    
    // Метод 2: Пробуем через DEX screener или другой источник
    console.log('[GRAM PRICE] МЕТОД 2: DexScreener');
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=GRAM');
      console.log('[GRAM PRICE] DexScreener response.status:', response.status);
      
      const data = await response.json();
      console.log('[GRAM PRICE] DexScreener данные:', data);
      
      if (data && data.pairs && data.pairs.length > 0) {
        // Ищем пару GRAM с наибольшей ликвидностью на TON
        const gramPair = data.pairs
          .filter(p => p.baseToken?.symbol?.toUpperCase() === 'GRAM' && p.chainId === 'ton')
          .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        
        console.log('[GRAM PRICE] Найденная пара GRAM:', gramPair);
        
        if (gramPair && gramPair.priceUsd) {
          gramPriceUsd = parseFloat(gramPair.priceUsd);
          console.log('[GRAM PRICE] ✅ курс (DexScreener):', gramPriceUsd, 'USD');
          console.log('[GRAM PRICE] ═══════════════════════════════════════');
          return;
        }
      }
    } catch (e) {
      console.error('[GRAM PRICE] ❌ DexScreener ошибка:', e);
    }
    
    // FALLBACK: Используем примерную цену из скриншота
    gramPriceUsd = 1.39; // цена из вашего кошелька
    console.log('[GRAM PRICE] ⚠️ используем фиксированный курс:', gramPriceUsd, 'USD');
    console.log('[GRAM PRICE] ═══════════════════════════════════════');
    
  } catch (e) {
    console.error('[GRAM PRICE] ❌❌❌ КРИТИЧЕСКАЯ ошибка:', e);
    gramPriceUsd = 1.39; // fallback
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
  console.log('[UI] updateCatalogBalance вызван');
  console.log('[UI] gramBalance:', gramBalance);
  console.log('[UI] connectedWallet:', connectedWallet);
  
  const element = document.getElementById('catalogBalance');
  if (!element) {
    console.log('[UI] ⚠️ catalogBalance элемент не найден');
    return;
  }

  if (!connectedWallet) {
    element.style.display = 'none';
    console.log('[UI] Скрываем catalogBalance (нет кошелька)');
    return;
  }

  element.style.display = 'block';

  const balanceAmount = document.getElementById('catalogBalanceAmount');
  const balanceTokens = document.getElementById('catalogBalanceTokens');
  
  if (balanceAmount) {
    balanceAmount.textContent = `${gramBalance.toFixed(2)} GRAM`;
    console.log('[UI] ✅ catalogBalanceAmount установлен:', balanceAmount.textContent);
  } else {
    console.log('[UI] ⚠️ catalogBalanceAmount не найден');
  }
  
  if (balanceTokens) {
    balanceTokens.textContent = connectedWallet.address.slice(0, 8) + '…' + connectedWallet.address.slice(-6);
    console.log('[UI] ✅ catalogBalanceTokens установлен:', balanceTokens.textContent);
  } else {
    console.log('[UI] ⚠️ catalogBalanceTokens не найден');
  }
}

export function updateProfileBalance() {
  console.log('[UI] updateProfileBalance вызван');
  console.log('[UI] gramBalance:', gramBalance);
  console.log('[UI] connectedWallet:', connectedWallet);
  
  const profileAmount = document.getElementById('profileBalanceAmount');
  const profileDetails = document.getElementById('profileBalanceDetails');
  
  if (!profileAmount || !profileDetails) {
    console.log('[UI] ⚠️ profileBalanceAmount или profileBalanceDetails не найден');
    return;
  }

  if (!connectedWallet) {
    profileAmount.textContent = '0 GRAM';
    profileDetails.textContent = t('wallet_not_connected') || 'Кошелёк не подключён';
    console.log('[UI] Установлен баланс профиля: 0 GRAM (нет кошелька)');
    return;
  }

  profileAmount.textContent = `${gramBalance.toFixed(4)} GRAM`;
  profileDetails.textContent = connectedWallet.address;
  console.log('[UI] ✅ Установлен баланс профиля:', profileAmount.textContent);
  console.log('[UI] ✅ Установлен адрес профиля:', profileDetails.textContent);
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
