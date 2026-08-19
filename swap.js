// swap.js — кросс-чейн свап TON ↔ SOL через Symbiosis API с комиссией

import { getWallet, sendTonTransaction, getTonBalance } from './wallet.js?v=16';
import { t } from './settings.js?v=5';

// Chain IDs в Symbiosis
const TON_CHAIN_ID = 607;
const SOLANA_CHAIN_ID = 1399811150;

// Популярные токены для свапа
export const POPULAR_TOKENS = [
  { 
    symbol: 'TON', 
    name: 'Toncoin', 
    address: 'native',
    chainId: TON_CHAIN_ID,
    decimals: 9,
    logoUrl: 'https://assets.dedust.io/images/ton.webp',
    chain: 'ton' 
  },
  { 
    symbol: 'SOL', 
    name: 'Solana', 
    address: 'native',
    chainId: SOLANA_CHAIN_ID,
    decimals: 9,
    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    chain: 'solana' 
  },
  { 
    symbol: 'USDT', 
    name: 'Tether (TON)', 
    address: 'EQCxE6mUtQJKFnP6aROTKOt1lZbDiX1kCixRv7Nw2Id_sDs0',
    chainId: TON_CHAIN_ID,
    decimals: 6,
    logoUrl: 'https://assets.dedust.io/images/usdt.webp',
    chain: 'ton',
    symbiosisAddress: '0x9328ED75956C38a25f59028B146Fecd3621Dfe'
  },
  { 
    symbol: 'USDC', 
    name: 'USD Coin (Solana)', 
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    chainId: SOLANA_CHAIN_ID,
    decimals: 6,
    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    chain: 'solana',
    symbiosisAddress: '0x0000000000000000000000000000000000000002'
  },
];

let swapTokenIn  = POPULAR_TOKENS[0]; // TON по умолчанию
let swapTokenOut = POPULAR_TOKENS[1]; // SOL по умолчанию
let lastQuote    = null;
let solanaAddressInput = ''; // Для получения SOL

export function initSwap() {
  const amountInEl  = document.getElementById('swapAmountIn');
  const amountOutEl = document.getElementById('swapAmountOut');
  const pickInBtn   = document.getElementById('pickTokenIn');
  const pickOutBtn  = document.getElementById('pickTokenOut');
  const swapBtn     = document.getElementById('swapBtn');
  const statusEl    = document.getElementById('swapStatus');

  const updateBtnLabels = () => {
    pickInBtn.textContent  = swapTokenIn.symbol  + ' ▾';
    pickOutBtn.textContent = swapTokenOut.symbol + ' ▾';
    updateBalanceHint();
    updateSolAddressField();
  };

  function updateBalanceHint() {
    const wallet = getWallet();
    let hint = document.getElementById('swapBalanceHint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'swapBalanceHint';
      hint.style.cssText = 'font-size:12px;color:var(--ink-3);margin-bottom:6px;text-align:right';
      const inputRow = document.querySelector('.swap-input-row');
      if (inputRow) {
        inputRow.parentElement.insertBefore(hint, inputRow);
      }
    }
    
    if (wallet && swapTokenIn.chain === 'ton') {
      const bal = getTonBalance();
      hint.textContent = bal ? `${t('balance')}: ${bal.toFixed(4)} TON` : '';
    } else {
      hint.textContent = '';
    }
  }

  // Поле для ввода Solana адреса когда свапаем TO N → SOL
  function updateSolAddressField() {
    let solField = document.getElementById('swapSolAddressField');
    
    // Показываем только если свапаем НА Solana
    if (swapTokenOut.chain === 'solana' && swapTokenIn.chain !== 'solana') {
      if (!solField) {
        solField = document.createElement('div');
        solField.id = 'swapSolAddressField';
        solField.style.cssText = 'margin-top:12px;padding:12px;background:var(--orange-lt);border-radius:var(--radius-sm);border-left:3px solid var(--orange)';
        solField.innerHTML = `
          <div style="font-size:12px;color:var(--ink-2);margin-bottom:6px;font-weight:600">
            💡 ${t('sol_address_required') || 'Введите адрес Solana кошелька для получения'}
          </div>
          <input type="text" id="solAddressInput" placeholder="Solana address (e.g. 7x...abc)" 
            style="width:100%;padding:8px 12px;border-radius:var(--radius-sm);border:1.5px solid var(--border);font-family:var(--mono);font-size:13px"
            value="${solanaAddressInput}">
        `;
        const quoteBox = document.getElementById('swapQuoteBox');
        if (quoteBox) {
          quoteBox.parentElement.insertBefore(solField, quoteBox);
        } else {
          swapBtn.parentElement.insertBefore(solField, swapBtn);
        }
        
        document.getElementById('solAddressInput').addEventListener('input', (e) => {
          solanaAddressInput = e.target.value.trim();
        });
      }
    } else {
      if (solField) {
        solField.remove();
      }
    }
  }

  updateBtnLabels();

  // Открыть пикер
  const openPicker = async (forSide) => {
    const chosen = await tokenPickerModal(forSide === 'in' ? swapTokenIn : swapTokenOut);
    if (!chosen) return;
    if (forSide === 'in')  swapTokenIn  = chosen;
    else                   swapTokenOut = chosen;
    updateBtnLabels();
    amountOutEl.value = '';
    lastQuote = null;
    statusEl.textContent = '';
  };

  pickInBtn.addEventListener('click',  () => openPicker('in'));
  pickOutBtn.addEventListener('click', () => openPicker('out'));

  // Стрелка — поменять местами
  document.querySelector('.swap-arrow').addEventListener('click', () => {
    [swapTokenIn, swapTokenOut] = [swapTokenOut, swapTokenIn];
    updateBtnLabels();
    amountOutEl.value = '';
    lastQuote = null;
  });

  // Дебаунс котировки при вводе суммы
  let quoteTimer;
  amountInEl.addEventListener('input', () => {
    clearTimeout(quoteTimer);
    amountOutEl.value = '';
    lastQuote = null;
    const quoteBox = document.getElementById('swapQuoteBox');
    if (quoteBox) quoteBox.style.display = 'none';
    swapBtn.textContent = t('swap_get_quote') || 'Получить котировку';
    statusEl.textContent = '';

    const val = parseFloat(amountInEl.value);
    if (!val || val <= 0) return;
    statusEl.textContent = '⏳ ' + (t('swap_calculating') || 'Расчёт...');
    quoteTimer = setTimeout(() => getQuote(val), 800);
  });

  swapBtn.addEventListener('click', async () => {
    const val = parseFloat(amountInEl.value);
    if (!val || val <= 0) { 
      statusEl.textContent = t('swap_enter_amount') || 'Введите сумму'; 
      return; 
    }

    if (!lastQuote) {
      // Получить котировку
      swapBtn.textContent = t('swap_loading') || 'Загрузка...';
      swapBtn.disabled = true;
      await getQuote(val);
      swapBtn.textContent = lastQuote ? (t('swap_confirm') || 'Подтвердить') : (t('swap_get_quote') || 'Получить котировку');
      swapBtn.disabled = false;
      return;
    }

    // Есть котировка — выполнить свап
    const wallet = getWallet();
    if (!wallet) {
      statusEl.textContent = '⚠️ ' + (t('wallet_connect_first') || 'Подключите кошелёк');
      return;
    }

    // Проверка адреса Solana если свапаем на SOL
    if (swapTokenOut.chain === 'solana' && swapTokenIn.chain !== 'solana') {
      if (!solanaAddressInput || solanaAddressInput.length < 32) {
        statusEl.textContent = '⚠️ ' + (t('sol_address_invalid') || 'Введите корректный Solana адрес');
        return;
      }
    }

    await executeSwap(wallet, statusEl, swapBtn);
  });

  async function getQuote(amount) {
    statusEl.textContent = '⏳ ' + (t('swap_loading') || 'Загрузка...');
    try {
      // Конвертируем amount в минимальные единицы
      const amountIn = Math.floor(amount * Math.pow(10, swapTokenIn.decimals)).toString();

      const res = await fetch('/api/swap/quote-cross-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenIn: swapTokenIn,
          tokenOut: swapTokenOut,
          amountIn: amountIn,
          solAddress: solanaAddressInput || undefined,
        }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      lastQuote = data;
      const outAmount = (parseFloat(data.amountOut) / Math.pow(10, swapTokenOut.decimals)).toFixed(6);
      const rate = (parseFloat(outAmount) / amount).toFixed(6);

      amountOutEl.value = outAmount;

      const receiveLabel = document.getElementById('swapReceiveLabel');
      if (receiveLabel) receiveLabel.textContent = `≈ ${outAmount} ${swapTokenOut.symbol}`;

      const quoteBox = document.getElementById('swapQuoteBox');
      if (quoteBox) {
        quoteBox.style.display = 'block';
        const qOut  = document.getElementById('swapQuoteOut');
        const qRate = document.getElementById('swapQuoteRate');
        const qFee  = document.getElementById('swapQuoteFee');
        const qTime = document.getElementById('swapQuoteTime');
        
        if (qOut)  qOut.textContent  = `${outAmount} ${swapTokenOut.symbol}`;
        if (qRate) qRate.textContent = `1 ${swapTokenIn.symbol} = ${rate} ${swapTokenOut.symbol}`;
        if (qFee)  qFee.textContent  = data.fee || '0.5%';
        if (qTime) qTime.textContent = data.estimatedTime || '2-5 min';
      }

      statusEl.textContent = `✓ ${t('swap_route') || 'Маршрут'}: Symbiosis (${swapTokenIn.symbol} → ${swapTokenOut.symbol})`;
      statusEl.style.color = 'var(--green)';
      swapBtn.textContent = t('swap_execute') || 'Выполнить обмен';
    } catch (e) {
      console.error('[Swap] Quote error:', e);
      statusEl.textContent = '❌ ' + e.message;
      statusEl.style.color = 'var(--red)';
      lastQuote = null;
      swapBtn.textContent = t('swap_get_quote') || 'Получить котировку';
      const quoteBox = document.getElementById('swapQuoteBox');
      if (quoteBox) quoteBox.style.display = 'none';
    }
  }

  async function executeSwap(wallet, statusEl, swapBtn) {
    swapBtn.disabled = true;
    swapBtn.textContent = t('swap_preparing') || 'Подготовка...';
    statusEl.textContent = '';
    
    try {
      // Получаем транзакцию для подписи
      const res = await fetch('/api/swap/execute-cross-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: lastQuote,
          userAddress: wallet.address,
          solAddress: solanaAddressInput || undefined,
        }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      swapBtn.textContent = t('swap_sign_wallet') || 'Подпишите в кошельке';
      
      // Отправляем TON транзакцию
      const txResult = await sendTonTransaction(
        data.toAddress,
        parseFloat(data.amount),
        data.payload || ''
      );

      statusEl.innerHTML = `✅ ${t('swap_done') || 'Обмен выполнен!'}<br><small>${t('swap_processing') || 'Обработка займёт 2-5 минут'}</small>`;
      statusEl.style.color = 'var(--green)';
      
      amountInEl.value  = '';
      amountOutEl.value = '';
      lastQuote = null;
      swapBtn.textContent = t('swap_get_quote') || 'Получить котировку';
      
      // Обновляем баланс через 5 секунд
      setTimeout(() => {
        updateBalanceHint();
      }, 5000);
      
    } catch (e) {
      console.error('[Swap] Execution error:', e);
      statusEl.textContent = '❌ ' + e.message;
      statusEl.style.color = 'var(--red)';
      swapBtn.textContent = t('swap_try_again') || 'Попробовать снова';
    } finally {
      swapBtn.disabled = false;
    }
  }
}

// ─── МОДАЛЬНОЕ ОКНО ВЫБОРА ТОКЕНА ────────────────────────────────────────────
function tokenPickerModal(current) {
  return new Promise(resolve => {
    const modal    = document.getElementById('tokenPickModal');
    const listEl   = document.getElementById('tokenPickList');
    const searchEl = document.getElementById('tokenPickSearch');
    const closeBtn = document.getElementById('tokenPickClose');

    if (!modal || !listEl) {
      console.error('[Swap] Token picker modal not found');
      resolve(null);
      return;
    }

    searchEl.value = '';
    renderTokenList('');

    function renderTokenList(query) {
      listEl.innerHTML = '';
      const wallet = getWallet();
      const tonBal = getTonBalance();

      const filtered = POPULAR_TOKENS.filter(t =>
        t.symbol.toLowerCase().includes(query.toLowerCase()) ||
        t.name.toLowerCase().includes(query.toLowerCase())
      );

      filtered.forEach(t => {
        // Показываем баланс TON
        let balance = null;
        if (wallet && t.chain === 'ton' && t.address === 'native') {
          balance = tonBal ? `${tonBal.toFixed(4)} TON` : null;
        }

        const card = document.createElement('div');
        card.className = 'coin-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
          <div class="coin-logo-wrap">
            <img class="coin-logo" src="${t.logoUrl || ''}" alt="${t.symbol}"
              style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="coin-logo-placeholder" style="${t.logoUrl ? 'display:none' : 'display:flex'}">${t.symbol[0]}</div>
          </div>
          <div class="coin-info">
            <div class="coin-name">${t.name}</div>
            <div class="coin-chain">${t.symbol} • ${t.chain.toUpperCase()}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            ${balance ? `<div style="font-size:13px;font-weight:600;font-family:var(--mono)">${balance}</div>` : ''}
            ${t.symbol === current.symbol && t.chain === current.chain ? '<div style="color:var(--orange);font-size:13px;font-weight:700">✓</div>' : ''}
          </div>
        `;
        card.addEventListener('click', () => { close(t); });
        listEl.appendChild(card);
      });
    }

    searchEl.addEventListener('input', () => renderTokenList(searchEl.value));

    function close(val) {
      modal.classList.remove('open');
      resolve(val);
    }
    const cancel = () => close(null);
    closeBtn.addEventListener('click', cancel);
    modal.classList.add('open');
  });
}
