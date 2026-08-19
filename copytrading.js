// copytrading.js — реальный copy-trading через Solscan + DexScreener
import { t as tr, onSettingsChange } from './settings.js?v=15';

let following = new Set(JSON.parse(localStorage.getItem('oracul_following') || '[]'));
let allTraders = [];
let _listEl = null;

export function initCopyTrading() {
  _listEl = document.getElementById('tradersList');
  const refreshEl = document.getElementById('tradersRefresh');

  if (refreshEl) {
    refreshEl.addEventListener('click', () => loadTraders(_listEl, true));
  }

  // При смене языка — перерисовываем карточки
  onSettingsChange((key) => {
    if (key === 'lang' && allTraders.length) {
      renderTraderList(allTraders, _listEl);
    }
  });

  loadTraders(_listEl, false);
}

// ─── ЗАГРУЗКА ТРЕЙДЕРОВ ───────────────────────────────────────────────────────
async function loadTraders(listEl, forceRefresh) {
  renderSkeleton(listEl);
  try {
    const res = await fetch('/api/traders/top');
    if (!res.ok) throw new Error('status ' + res.status);
    allTraders = await res.json();
    renderTraderList(allTraders, listEl);
  } catch (e) {
    listEl.innerHTML = `
      <div style="text-align:center;padding:32px 16px;color:var(--ink-2)">
        <div style="font-size:32px;margin-bottom:8px">⚠️</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:4px">${t('copy_error') || 'Error'}</div>
        <div style="font-size:12px;color:var(--ink-3)">${e.message}</div>
        <button onclick="location.reload()" style="margin-top:12px;padding:8px 18px;border-radius:20px;background:var(--orange);color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer">${t('copy_refresh')}</button>
      </div>`;
  }
}

// ─── СКЕЛЕТОН ─────────────────────────────────────────────────────────────────
function renderSkeleton(listEl) {
  listEl.innerHTML = Array(4).fill(`
    <div class="trader-card" style="pointer-events:none">
      <div class="skeleton" style="width:46px;height:46px;border-radius:50%;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <div class="skeleton" style="height:14px;width:60%"></div>
        <div class="skeleton" style="height:11px;width:40%"></div>
        <div class="skeleton" style="height:11px;width:50%"></div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <div class="skeleton" style="height:18px;width:50px"></div>
        <div class="skeleton" style="height:28px;width:80px;border-radius:20px"></div>
      </div>
    </div>`).join('');
}

// ─── РЕНДЕР СПИСКА ────────────────────────────────────────────────────────────
function renderTraderList(traders, listEl) {
  listEl.innerHTML = '';
  if (!traders.length) {
    listEl.innerHTML = `<p style="color:var(--ink-3);font-size:14px;padding:24px 0;text-align:center">${t('copy_no_data')}</p>`;
    return;
  }
  traders.forEach(t => listEl.appendChild(makeTraderCard(t)));
}

// ─── КАРТОЧКА ТРЕЙДЕРА ────────────────────────────────────────────────────────
function makeTraderCard(t) {
  const card    = document.createElement('div');
  card.className = 'trader-card';
  card.dataset.address = t.address;

  const isUp      = (t.pnl30d || 0) >= 0;
  const isCopying = following.has(t.address);
  const short     = t.short || (t.address.slice(0,4) + '…' + t.address.slice(-4));
  const pnlSign   = isUp ? '+' : '';
  const pnlVal    = typeof t.pnl30d === 'number' ? t.pnl30d.toFixed(1) : '—';

  // Топ токены
  const tokens = (t.topTokens || []).slice(0, 3);
  const tokenBadges = tokens.map(sym =>
    `<span style="background:var(--orange-lt);color:var(--orange-dk);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:600">${sym}</span>`
  ).join('');

  // Последняя активность
  let activityText = '';
  if (t.lastActiveHours != null) {
    if (t.lastActiveHours < 1)       activityText = tr('active_now');
    else if (t.lastActiveHours < 24) activityText = `${tr('active')} ${t.lastActiveHours}${tr('active_h')}`;
    else                              activityText = `${tr('active')} ${Math.floor(t.lastActiveHours/24)}${tr('active_d')}`;
  }

  card.innerHTML = `
    <div class="trader-avatar-wrap">
      <div class="trader-avatar">${(t.name || '?')[0].toUpperCase()}</div>
      ${isCopying ? '<div class="trader-copy-dot"></div>' : ''}
    </div>
    <div class="trader-info">
      <div class="trader-name">${t.name || short}</div>
      <div class="trader-addr">
        <a href="${t.solscanUrl || '#'}" target="_blank"
           style="color:var(--ink-3);font-size:11px;font-family:var(--mono)">${short}</a>
      </div>
      <div style="display:flex;align-items:center;gap:4px;margin-top:3px;flex-wrap:wrap">
        ${tokenBadges}
        ${activityText ? `<span style="font-size:10px;color:var(--ink-3)">${activityText}</span>` : ''}
      </div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:2px">
        ${t.swaps30d ? `${t.swaps30d} ${tr('copy_swaps')}` : ''} · ${(t.followers||0).toLocaleString()} ${tr('copy_followers')}
      </div>
    </div>
    <div class="trader-right">
      <div class="trader-pnl ${isUp ? 'up' : 'down'}">${pnlSign}${pnlVal}%</div>
      <div style="font-size:10px;color:var(--ink-3);margin-top:1px;margin-bottom:6px">30d PnL</div>
      <button class="copy-btn ${isCopying ? 'active' : ''}" data-addr="${t.address}">
        ${isCopying ? tr('copy_btn_active') : tr('copy_btn')}
      </button>
      <button class="txns-btn" data-addr="${t.address}" style="margin-top:4px">
        ${tr('copy_txns')}
      </button>
    </div>
  `;

  card.querySelector('.copy-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleCopy(t, card);
  });

  card.querySelector('.txns-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleTxns(t, card);
  });

  return card;
}

// ─── КОПИРОВАНИЕ ──────────────────────────────────────────────────────────────
function toggleCopy(trader, card) {
  const btn = card.querySelector('.copy-btn');
  const dot = card.querySelector('.trader-copy-dot');
  if (following.has(trader.address)) {
    following.delete(trader.address);
    btn.textContent = tr('copy_btn');
    btn.classList.remove('active');
    if (dot) dot.remove();
    showToast(`${tr('copy_unfollow_toast')} ${trader.name}`);
  } else {
    following.add(trader.address);
    btn.textContent = tr('copy_btn_active');
    btn.classList.add('active');
    if (!card.querySelector('.trader-copy-dot')) {
      const d = document.createElement('div');
      d.className = 'trader-copy-dot';
      card.querySelector('.trader-avatar-wrap').appendChild(d);
    }
    showToast(`${tr('copy_follow_toast')} ${trader.name} 🚀`);
  }
  localStorage.setItem('oracul_following', JSON.stringify([...following]));
}

// ─── ТРАНЗАКЦИИ ТРЕЙДЕРА ──────────────────────────────────────────────────────
async function toggleTxns(trader, card) {
  const btn = card.querySelector('.txns-btn');
  const existing = card.querySelector('.trader-txns');

  if (existing) {
    existing.remove();
    btn.textContent = tr('copy_txns');
    return;
  }

  btn.textContent = tr('copy_loading');
  btn.disabled = true;

  try {
    const res  = await fetch(`/api/traders/${trader.address}/txns`);
    const txns = await res.json();

    const wrap = document.createElement('div');
    wrap.className = 'trader-txns';

    if (!txns.length || txns.error) {
      wrap.innerHTML = `
        <div style="font-size:12px;color:var(--ink-3);padding:10px 0;text-align:center">
          ${tr('copy_no_data')}
        </div>`;
    } else {
      const swapCount = txns.filter(tx => tx.isSwap).length;
      wrap.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:12px;font-weight:600;color:var(--ink)">${tr('copy_last_deals')}</span>
          <span style="font-size:11px;color:var(--ink-3)">${swapCount} ${tr('copy_swaps_of')} ${txns.length}</span>
        </div>`;

      txns.forEach(tx => {
        const row = document.createElement('div');
        row.className = 'trader-tx-row';
        row.innerHTML = buildTxRow(tx);
        wrap.appendChild(row);
      });
    }

    card.appendChild(wrap);
    btn.textContent = tr('copy_txns_hide');
  } catch (e) {
    const wrap = document.createElement('div');
    wrap.className = 'trader-txns';
    wrap.innerHTML = `<div style="font-size:12px;color:var(--red);padding:8px 0">${tr('error') || 'Error'}: ${e.message}</div>`;
    card.appendChild(wrap);
    btn.textContent = tr('copy_txns_hide');
  } finally {
    btn.disabled = false;
  }
}

// ─── РЕНДЕР ОДНОЙ ТРАНЗАКЦИИ ──────────────────────────────────────────────────
function buildTxRow(tx) {
  const ok   = (tx.status || '').toLowerCase().includes('success');
  const d    = tx.time
    ? new Date(tx.time * 1000).toLocaleString('ru', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';
  const sig  = tx.sig ? tx.sig.slice(0, 8) + '…' : '—';
  const link = tx.solscanUrl
    ? `<a href="${tx.solscanUrl}" target="_blank"
         style="font-size:10px;color:var(--orange);font-family:var(--mono);
                text-decoration:none;white-space:nowrap">${sig} ↗</a>`
    : `<span style="font-size:10px;color:var(--ink-3);font-family:var(--mono)">${sig}</span>`;

  // ── Свап ─────────────────────────────────────────────────────────────────
  if (tx.isSwap) {
    const symOut = tx.symbolOut || tx.tokenOut?.slice(0, 6) || '?';
    const symIn  = tx.symbolIn  || tx.tokenIn?.slice(0, 6)  || '?';
    const hasAmounts = tx.amountOut != null && tx.amountIn != null;

    // Направление: продали tokenOut, получили tokenIn
    // BUY = купили что-то за SOL/USDC
    const stables  = new Set(['SOL', 'USDC', 'USDT', 'WSOL']);
    const isBuy    = stables.has(symOut) && !stables.has(symIn);
    const isSell   = !stables.has(symOut) && stables.has(symIn);
    const dirLabel = isBuy ? 'BUY' : isSell ? 'SELL' : 'SWAP';
    const dirColor = isBuy ? 'var(--green)' : isSell ? 'var(--red)' : 'var(--orange)';
    const dirBg    = isBuy ? 'rgba(22,163,74,.1)' : isSell ? 'rgba(220,38,38,.1)' : 'rgba(255,107,26,.1)';

    const dexLabel = tx.dex
      ? `<span style="font-size:9px;color:var(--ink-3);margin-left:3px">${tx.dex}</span>`
      : '';

    const amountsHtml = hasAmounts
      ? `<div style="font-size:11px;color:var(--ink-2);margin-top:2px;font-family:var(--mono)">
           <span style="color:var(--red)">${fmtAmount(tx.amountOut)} ${symOut}</span>
           <span style="color:var(--ink-3);margin:0 3px">→</span>
           <span style="color:var(--green)">${fmtAmount(tx.amountIn)} ${symIn}</span>
         </div>`
      : `<div style="font-size:11px;color:var(--ink-2);margin-top:2px">
           <span style="color:var(--ink-3)">${symOut}</span>
           <span style="color:var(--ink-3);margin:0 3px">→</span>
           <span style="color:var(--ink-2);font-weight:600">${symIn}</span>
         </div>`;

    return `
      <div style="display:flex;align-items:flex-start;gap:8px;width:100%">
        <span style="
          width:36px;flex-shrink:0;text-align:center;
          background:${dirBg};color:${dirColor};
          border-radius:6px;padding:2px 0;font-size:10px;font-weight:700;
          margin-top:2px
        ">${dirLabel}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:4px">
            <span style="font-size:11px;color:var(--ink-3)">${d}</span>
            <div style="display:flex;align-items:center;gap:4px">
              ${dexLabel}
              ${link}
            </div>
          </div>
          ${amountsHtml}
        </div>
      </div>`;
  }

  // ── Обычная транзакция (не свап) ─────────────────────────────────────────
  return `
    <div style="display:flex;align-items:center;gap:8px;width:100%">
      <span class="trader-tx-status ${ok ? 'ok' : 'fail'}">${ok ? '✓' : '✗'}</span>
      <span style="font-size:11px;color:var(--ink-3);font-family:var(--mono)">${d}</span>
      <div style="margin-left:auto">${link}</div>
    </div>`;
}

function fmtAmount(n) {
  if (n == null) return '?';
  if (n >= 1e6)    return (n / 1e6).toFixed(2)  + 'M';
  if (n >= 1000)   return (n / 1000).toFixed(2) + 'K';
  if (n >= 1)      return n.toFixed(2);
  if (n >= 0.001)  return n.toFixed(4);
  return n.toFixed(6);
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(10px);
    background:#1A1A1A;color:#fff;padding:10px 18px;
    border-radius:20px;font-size:13px;font-weight:500;z-index:300;
    opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;white-space:nowrap;
  `;
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(6px)';
    setTimeout(() => t.remove(), 250);
  }, 2200);
}
