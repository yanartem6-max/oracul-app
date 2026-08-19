// swap.js — свап через Jupiter API (Solana), комиссия 0.5% идёт владельцу

import { getWallet, signAndSendTransaction, getWalletTokens, getSolBalance } from './wallet.js?v=15';
import { getTonSwapQuote, getTonPrice, saveTonSwapHistory, TON_MINT, WSOL_MINT } from './ton-swap.js?v=15';

// SOL mint address (нативный)
export const SOL_MINT  = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Популярные мем-коины на Solana (используется для пикера)
export const POPULAR_MEME = [
  { symbol: 'SOL',   name: 'Solana',    mint: SOL_MINT,  logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', chain: 'solana' },
  { symbol: 'BONK',  name: 'Bonk',      mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', logoUrl: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I', chain: 'solana' },
  { symbol: 'WIF',   name: 'dogwifhat', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', logoUrl: 'https://bafkreibk3covs5ltyqxa272uodhculbgn2zm52cx3r5nfgg4t32r3ndiyi.ipfs.nftstorage.link', chain: 'solana' },
  { symbol: 'POPCAT',name: 'Popcat',    mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', logoUrl: 'https://bafkreigtag6czn7xhvwmrmlkuuxwk2h3mxogyuoqn6hv7htfscpg5jhkdm.ipfs.nftstorage.link', chain: 'solana' },
  { symbol: 'MOODENG',name:'Moo Deng', mint: 'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzc8EU', logoUrl: '', chain: 'solana' },
  { symbol: 'TON',   name: 'Toncoin',   mint: TON_MINT, logoUrl: 'https://wallet.ton.org/img/logo.png', chain: 'ton' },
  { symbol: 'WSOL',  name: 'Wrapped SOL', mint: WSOL_MINT, logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', chain: 'ton' },
];

let swapTokenIn  = POPULAR_MEME[0]; // SOL по умолчанию
let swapTokenOut = POPULAR_MEME[1]; // BONK по умолчанию
let lastQuote    = null;

function lamports(amount, decimals = 9) {
  return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
}

function humanAmount(raw, decimals = 9) {
  return (Number(raw) / Math.pow(10, decimals)).toFixed(6);
}

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
    // Показываем баланс входного токена
    updateBalanceHint();
  };

  function updateBalanceHint() {
    const walletToks = getWalletTokens();
    const sol        = getSolBalance();
    let bal = null;
    if (swapTokenIn.mint === 'So11111111111111111111111111111111111111112') {
      bal = sol != null ? sol.toFixed(4) + ' SOL' : null;
    } else {
      const wt = walletToks.find(w => w.mint === swapTokenIn.mint);
      bal = wt ? wt.amount.toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' ' + swapTokenIn.symbol : null;
    }
    let hint = document.getElementById('swapBalanceHint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'swapBalanceHint';
      hint.style.cssText = 'font-size:12px;color:var(--ink-500);margin-bottom:6px;text-align:right';
      amountInEl.parentElement.parentElement.insertBefore(hint, amountInEl.parentElement.parentElement.querySelector('.swap-input-row'));
    }
    hint.textContent = bal ? `Баланс: ${bal}` : '';
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
    // Скрываем quote-box пока нет данных
    const quoteBox = document.getElementById('swapQuoteBox');
    if (quoteBox) quoteBox.style.display = 'none';
    swapBtn.textContent = t('swap_get_quote');
    statusEl.textContent = '';

    const val = parseFloat(amountInEl.value);
    if (!val || val <= 0) return;
    // Показываем лоадер сразу
    statusEl.textContent = '⏳ ' + t('swap_calculating');
    quoteTimer = setTimeout(() => getQuote(val), 600);
  });

  swapBtn.addEventListener('click', async () => {
    const val = parseFloat(amountInEl.value);
    if (!val || val <= 0) { statusEl.textContent = t('swap_enter_amount'); return; }

    if (!lastQuote) {
      // Сначала получить котировку
      swapBtn.textContent = t('swap_loading');
      swapBtn.disabled = true;
      await getQuote(val);
      swapBtn.textContent = lastQuote ? 'Подтвердить свап' : 'Получить котировку';
      swapBtn.disabled = false;
      return;
    }

    // Есть котировка — выполнить свап
    const wallet = getWallet();
    if (!wallet) {
      statusEl.textContent = '⚠️ ' + t('wallet_connect_first');
      return;
    }
    
    if (wallet.type === 'ton') {
      // TON свапы через Ston.fi
      if (swapTokenIn.chain === 'ton' && swapTokenOut.chain === 'ton') {
        await executeTonSwap(wallet.address, statusEl, swapBtn);
      } else {
        statusEl.textContent = '⚠️ ' + t('swap_between_chains');
      }
      return;
    }
    
    if (wallet.type !== 'phantom') {
      statusEl.textContent = '⚠️ ' + t('swap_unknown_wallet');
      return;
    }

    // Солана свапы через Jupiter
    await executeSwap(wallet.address, statusEl, swapBtn);
  });

  async function getQuote(amount) {
    statusEl.textContent = '⏳ ' + t('swap_loading');
    try {
      // Проверяем тип свапа
      if (swapTokenIn.chain === 'ton' || swapTokenOut.chain === 'ton') {
        // TON свап через Ston.fi
        const res = await fetch('/api/ton/swap/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountIn: Math.floor(amount * 1e9).toString(), // В нанотонах
            tokenIn: swapTokenIn.mint,
            tokenOut: swapTokenOut.mint,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        lastQuote = data;
        const outAmount = (parseInt(data.amountOut || '0') / 1e9).toString();
        const outFormatted = Number(outAmount).toLocaleString('ru', { maximumFractionDigits: 6 });
        const rate = (Number(outAmount) / amount).toFixed(4);
        const slippage = (data.slippage || 0.5).toFixed(1);

        amountOutEl.value = outAmount;

        const receiveLabel = document.getElementById('swapReceiveLabel');
        if (receiveLabel) receiveLabel.textContent = `≈ ${outFormatted} ${swapTokenOut.symbol}`;

        const quoteBox = document.getElementById('swapQuoteBox');
        if (quoteBox) {
          quoteBox.style.display = 'block';
          const qOut  = document.getElementById('swapQuoteOut');
          const qRate = document.getElementById('swapQuoteRate');
          const qSlip = document.getElementById('swapQuoteSlippage');
          if (qOut)  qOut.textContent  = `${outFormatted} ${swapTokenOut.symbol}`;
          if (qRate) qRate.textContent = `1 ${swapTokenIn.symbol} = ${rate} ${swapTokenOut.symbol}`;
          if (qSlip) qSlip.textContent = `${slippage}%`;
        }

        statusEl.textContent = `✓ Маршрут: Ston.fi`;
        statusEl.style.color = 'var(--green)';
        swapBtn.textContent = `Свапнуть ${amount} ${swapTokenIn.symbol} → ${outFormatted} ${swapTokenOut.symbol}`;
      } else {
        // SOL свап через Jupiter
        const amountLamports = lamports(amount, swapTokenIn.decimals ?? 9);
        const res = await fetch('/api/swap/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputMint: swapTokenIn.mint,
            outputMint: swapTokenOut.mint,
            amount: amountLamports,
            slippageBps: 100,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        lastQuote = data;

        const outAmount   = humanAmount(data.outAmount, swapTokenOut.decimals ?? 9);
        const outFormatted = Number(outAmount).toLocaleString('ru', { maximumFractionDigits: 6 });
        const rate         = (Number(outAmount) / amount).toFixed(4);
        const slippage     = (data.slippageBps / 100).toFixed(1);

        amountOutEl.value = outAmount;

        const receiveLabel = document.getElementById('swapReceiveLabel');
        if (receiveLabel) receiveLabel.textContent = `≈ ${outFormatted} ${swapTokenOut.symbol}`;

        const quoteBox = document.getElementById('swapQuoteBox');
        if (quoteBox) {
          quoteBox.style.display = 'block';
          const qOut  = document.getElementById('swapQuoteOut');
          const qRate = document.getElementById('swapQuoteRate');
          const qSlip = document.getElementById('swapQuoteSlippage');
          if (qOut)  qOut.textContent  = `${outFormatted} ${swapTokenOut.symbol}`;
          if (qRate) qRate.textContent = `1 ${swapTokenIn.symbol} = ${rate} ${swapTokenOut.symbol}`;
          if (qSlip) qSlip.textContent = `${slippage}%`;
        }

        const route = data.routePlan?.[0]?.swapInfo?.label || 'Jupiter';
        statusEl.textContent = `✓ Маршрут: ${route}`;
        statusEl.style.color = 'var(--green)';
        swapBtn.textContent = `Свапнуть ${amount} ${swapTokenIn.symbol} → ${outFormatted} ${swapTokenOut.symbol}`;
      }
    } catch (e) {
      statusEl.textContent = '❌ ' + e.message;
      statusEl.style.color = 'var(--red)';
      lastQuote = null;
      swapBtn.textContent = t('swap_get_quote');
      const quoteBox = document.getElementById('swapQuoteBox');
      if (quoteBox) quoteBox.style.display = 'none';
    }
  }

  async function executeSwap(userPublicKey, statusEl, swapBtn) {
    swapBtn.disabled = true;
    swapBtn.textContent = t('swap_preparing');
    statusEl.textContent = '';
    try {
      const res = await fetch('/api/swap/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteResponse: lastQuote, userPublicKey }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      swapBtn.textContent = t('swap_sign_wallet');
      const sig = await signAndSendTransaction(data.swapTransaction);
      statusEl.innerHTML = `✅ ${t('swap_done')} <a href="https://solscan.io/tx/${sig}" target="_blank" style="color:var(--orange-600)">${t('swap_view_tx')}</a>`;
      amountInEl.value  = '';
      amountOutEl.value = '';
      lastQuote = null;
      swapBtn.textContent = t('swap_get_quote');
    } catch (e) {
      statusEl.textContent = '❌ ' + e.message;
      swapBtn.textContent = t('swap_try_again');
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

    searchEl.value = '';
    renderTokenList('');

    function renderTokenList(query) {
      listEl.innerHTML = '';
      const walletToks = getWalletTokens();
      const sol        = getSolBalance();

      // Строим список: сначала токены из кошелька, потом популярные
      const ownedMints = new Set(walletToks.map(t => t.mint));

      // Добавляем SOL с балансом
      const allTokens = [...POPULAR_MEME];

      // Добавляем токены кошелька которых нет в списке
      walletToks.forEach(wt => {
        if (!allTokens.find(t => t.mint === wt.mint)) {
          allTokens.push({ symbol: wt.mint.slice(0,4)+'…', name: 'Unknown', mint: wt.mint, logoUrl: '' });
        }
      });

      const filtered = allTokens.filter(t =>
        t.symbol.toLowerCase().includes(query.toLowerCase()) ||
        t.name.toLowerCase().includes(query.toLowerCase())
      );

      filtered.forEach(t => {
        // Баланс из кошелька
        let balance = null;
        if (t.mint === 'So11111111111111111111111111111111111111112') {
          balance = sol != null ? sol.toFixed(4) + ' SOL' : null;
        } else {
          const wt = walletToks.find(w => w.mint === t.mint);
          if (wt) balance = wt.amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
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
            <div class="coin-chain">${t.symbol}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            ${balance ? `<div style="font-size:13px;font-weight:600;font-family:var(--mono)">${balance}</div>` : ''}
            ${t.mint === current.mint ? '<div style="color:var(--orange);font-size:13px;font-weight:700">✓</div>' : ''}
          </div>
        `;
        card.addEventListener('click', () => { close(t); });
        listEl.appendChild(card);
      });
    }

    searchEl.addEventListener('input', () => renderTokenList(searchEl.value));

    function close(val) {
      modal.classList.remove('open');
      searchEl.removeEventListener('input', renderTokenList);
      closeBtn.removeEventListener('click', cancel);
      resolve(val);
    }
    const cancel = () => close(null);
    closeBtn.addEventListener('click', cancel);
    modal.classList.add('open');
  });
}

// TON свапы через Ston.fi
async function executeTonSwap(userAddress, statusEl, swapBtn) {
  swapBtn.disabled = true;
  swapBtn.textContent = t('swap_initiated');
  statusEl.textContent = t('swap_initiated');
  
  try {
    // Здесь будет логика выполнения свопа через TON wallet
    // Требуется интеграция с TON Connect для подписи транзакции
    
    const swapData = {
      tokenIn: swapTokenIn.mint,
      tokenOut: swapTokenOut.mint,
      amountIn: parseFloat(amountInEl.value),
      amountOut: parseFloat(amountOutEl.value),
      timestamp: Date.now(),
      status: 'pending',
    };

    // Сохраняем историю
    saveTonSwapHistory(swapData);

    statusEl.textContent = t('swap_recorded');
    statusEl.style.color = 'var(--green)';
    swapBtn.textContent = t('swap_completed');
    
    // Сбрасываем котировку
    lastQuote = null;
    amountInEl.value = '';
    amountOutEl.value = '';
    
    setTimeout(() => {
      swapBtn.disabled = false;
      swapBtn.textContent = t('swap_get_quote');
      statusEl.textContent = '';
    }, 3000);
    
  } catch (e) {
    console.error('Ошибка свопа:', e);
    statusEl.textContent = t('swap_error') + e.message;
    statusEl.style.color = 'var(--red)';
    swapBtn.disabled = false;
    swapBtn.textContent = t('swap_get_quote');
  }
}
