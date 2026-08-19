// profile.js — профиль пользователя и история транзакций
import { getWallet, getWalletTokens, getSolBalance, getTokenPrices, updateTokenPrices } from './wallet.js?v=15';
import { t } from './settings.js?v=15';

const RPC_URL = 'https://api.mainnet-beta.solana.com';

// Кеш символов токенов
const symbolCache = new Map();
async function getTokenSymbol(mint) {
  if (!mint) return '?';
  if (mint === 'So11111111111111111111111111111111111111112') return 'SOL';
  
  if (symbolCache.has(mint)) return symbolCache.get(mint);

  try {
    const r = await fetch(`/api/coins/${mint}`, {
      headers: { 'User-Agent': 'ORACUL/1.0' }
    });
    if (r.ok) {
      const data = await r.json();
      const symbol = data?.pairs?.[0]?.baseToken?.symbol;
      if (symbol) {
        symbolCache.set(mint, symbol);
        return symbol;
      }
    }
  } catch {}

  const short = mint.slice(0, 4) + '…';
  symbolCache.set(mint, short);
  return short;
}

// Получить подписи транзакций кошелька
async function getWalletSignatures(address, limit = 20) {
  try {
    const r = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getSignaturesForAddress',
        params: [address, { limit }]
      }),
    });
    if (!r.ok) return [];
    const data = await r.json();
    return data?.result || [];
  } catch (e) {
    console.error('[profile] getSignatures error:', e);
    return [];
  }
}

// Получить детали транзакции
async function getTransaction(signature) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    
    const r = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTransaction',
        params: [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timer);
    if (!r.ok) return null;
    
    const data = await r.json();
    return data?.result || null;
  } catch (e) {
    console.error('[profile] getTx error:', e);
    return null;
  }
}

// Парсим swap из транзакции
function parseSwap(tx) {
  if (!tx?.meta?.postTokenBalances) return null;

  const preBalances = tx.meta.preTokenBalances || [];
  const postBalances = tx.meta.postTokenBalances || [];
  const changes = new Map();

  for (const post of postBalances) {
    const mint = post.mint;
    const postAmount = parseFloat(post.uiTokenAmount?.uiAmount || 0);
    const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
    const preAmount = parseFloat(pre?.uiTokenAmount?.uiAmount || 0);
    const diff = postAmount - preAmount;

    if (Math.abs(diff) > 0.000001) {
      changes.set(mint, (changes.get(mint) || 0) + diff);
    }
  }

  // Ищем что вышло и что пришло
  let tokenIn = null, tokenOut = null, amountIn = 0, amountOut = 0;
  
  for (const [mint, diff] of changes) {
    if (diff > 0) {
      tokenOut = mint;
      amountOut = diff;
    }
    if (diff < 0) {
      tokenIn = mint;
      amountIn = Math.abs(diff);
    }
  }

  if (tokenIn && tokenOut) {
    return { tokenIn, tokenOut, amountIn, amountOut };
  }

  return null;
}

export async function loadProfileTransactions(address) {
  try {
    const signatures = await getWalletSignatures(address, 15);
    if (!signatures.length) return [];

    // Получаем детали первых 10 транзакций параллельно
    const txPromises = signatures.slice(0, 10).map(s => getTransaction(s.signature));
    const txData = await Promise.allSettled(txPromises);

    const prices = getTokenPrices();
    const transactions = [];

    for (let i = 0; i < signatures.length && i < 10; i++) {
      const sig = signatures[i];
      const txResult = txData[i];
      const tx = txResult?.status === 'fulfilled' ? txResult.value : null;

      const swap = tx ? parseSwap(tx) : null;

      if (swap) {
        const symbolIn = await getTokenSymbol(swap.tokenIn);
        const symbolOut = await getTokenSymbol(swap.tokenOut);

        const priceIn = prices[swap.tokenIn]?.price || 0;
        const priceOut = prices[swap.tokenOut]?.price || 0;

        const valueIn = swap.amountIn * priceIn;
        const valueOut = swap.amountOut * priceOut;
        const pnl = valueOut - valueIn;
        const pnlPercent = valueIn > 0 ? (pnl / valueIn) * 100 : 0;

        transactions.push({
          sig: sig.signature,
          type: 'swap',
          time: sig.blockTime * 1000,
          tokenIn: symbolIn,
          tokenOut: symbolOut,
          amountIn: swap.amountIn,
          amountOut: swap.amountOut,
          valueIn,
          valueOut,
          pnl,
          pnlPercent,
          status: sig.err ? 'failed' : 'success',
          solscanUrl: `https://solscan.io/tx/${sig.signature}`,
        });
      }
    }

    return transactions.sort((a, b) => b.time - a.time);
  } catch (e) {
    console.error('[profile] loadTransactions error:', e);
    return [];
  }
}

export function renderProfileTransactions(transactions) {
  const list = document.getElementById('profileTxList');
  if (!list) return;

  if (!transactions || transactions.length === 0) {
    list.innerHTML = `<div style="text-align:center;color:var(--ink-3);padding:24px;font-size:13px">
      ${t('wallet_no_tokens')}
    </div>`;
    return;
  }

  list.innerHTML = transactions.map(tx => {
    const date = new Date(tx.time);
    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

    const isProfit = tx.pnl > 0;
    const pnlColor = isProfit ? 'var(--green)' : 'var(--red)';
    const pnlSign = isProfit ? '+' : '';
    const statusIcon = tx.status === 'success' ? '✓' : '✗';

    return `
      <div style="
        background:var(--surface-2);
        border-radius:8px;
        padding:12px;
        border-left:3px solid ${pnlColor};
        cursor:pointer;
        transition:background 0.2s;
      " onclick="window.open('${tx.solscanUrl}', '_blank')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
          <div>
            <div style="font-weight:600;font-size:13px">
              ${statusIcon} ${tx.tokenIn} → ${tx.tokenOut}
            </div>
            <div style="font-size:11px;color:var(--ink-3);margin-top:2px">
              ${timeStr} · ${dateStr}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:600;color:${pnlColor};font-size:13px">
              ${pnlSign}$${Math.abs(tx.pnl).toFixed(2)}
            </div>
            <div style="font-size:11px;color:${pnlColor}">
              ${pnlSign}${Math.abs(tx.pnlPercent).toFixed(1)}%
            </div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--ink-3);display:flex;justify-content:space-between">
          <span>${tx.amountIn.toFixed(4)} ${tx.tokenIn}</span>
          <span>→</span>
          <span>${tx.amountOut.toFixed(4)} ${tx.tokenOut}</span>
        </div>
      </div>
    `;
  }).join('');
}

export async function initProfile() {
  const profileBtn = document.querySelector('.nav-btn[data-page="pageProfile"]');
  if (!profileBtn) return;

  profileBtn.addEventListener('click', async () => {
    const wallet = getWallet();
    if (!wallet?.address) {
      document.getElementById('profileTxList').innerHTML = `
        <div style="text-align:center;color:var(--ink-3);padding:24px;font-size:13px">
          ${t('wallet_connect_to_see')}
        </div>
      `;
      return;
    }

    // Загружаем транзакции
    const txList = document.getElementById('profileTxList');
    txList.innerHTML = `<div style="text-align:center;color:var(--ink-3);padding:24px">${t('loading_transactions')}</div>`;

    await updateTokenPrices();
    const transactions = await loadProfileTransactions(wallet.address);
    renderProfileTransactions(transactions);
  });
}
