// watchlist.js — избранные токены с алертами

const WATCHLIST_KEY = 'oracul_watchlist';
const ALERTS_KEY = 'oracul_alerts';

// Структура: { pairAddress, symbol, name, addedPrice, addedAt, alertUp, alertDown }
let watchlist = [];
let priceAlerts = {}; // { pairAddress: { lastPrice, lastCheck } }

/**
 * Загрузить watchlist из localStorage
 */
export function loadWatchlist() {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    watchlist = stored ? JSON.parse(stored) : [];
    return watchlist;
  } catch (e) {
    console.error('[Watchlist] Load error:', e);
    return [];
  }
}

/**
 * Сохранить watchlist в localStorage
 */
function saveWatchlist() {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  } catch (e) {
    console.error('[Watchlist] Save error:', e);
  }
}

/**
 * Добавить токен в watchlist
 */
export function addToWatchlist(pair, alertUp = 10, alertDown = -10) {
  const pairAddress = pair.pairAddress;
  
  // Проверяем что уже не добавлен
  if (watchlist.find(w => w.pairAddress === pairAddress)) {
    return { success: false, message: 'Токен уже в избранном' };
  }

  const item = {
    pairAddress,
    symbol: pair.baseToken?.symbol || '?',
    name: pair.baseToken?.name || pair.baseToken?.symbol || '?',
    chainId: pair.chainId || 'solana',
    addedPrice: parseFloat(pair.priceUsd) || 0,
    addedAt: Date.now(),
    alertUp: alertUp,     // процент роста для алерта
    alertDown: alertDown, // процент падения для алерта
    logoUrl: pair.info?.imageUrl || pair._logoUrl || null,
  };

  watchlist.push(item);
  saveWatchlist();
  
  return { success: true, message: `✓ ${item.symbol} добавлен в избранное` };
}

/**
 * Удалить из watchlist
 */
export function removeFromWatchlist(pairAddress) {
  const index = watchlist.findIndex(w => w.pairAddress === pairAddress);
  if (index === -1) return { success: false, message: 'Токен не найден' };
  
  const item = watchlist[index];
  watchlist.splice(index, 1);
  saveWatchlist();
  
  return { success: true, message: `${item.symbol} удалён из избранного` };
}

/**
 * Проверить находится ли токен в watchlist
 */
export function isInWatchlist(pairAddress) {
  return watchlist.some(w => w.pairAddress === pairAddress);
}

/**
 * Получить весь watchlist
 */
export function getWatchlist() {
  return watchlist;
}

/**
 * Обновить цены и проверить алерты
 */
export async function checkPriceAlerts() {
  if (watchlist.length === 0) return;

  const alerts = [];

  for (const item of watchlist) {
    try {
      // Получаем свежую цену
      const res = await fetch(`/api/coins/${item.pairAddress}`);
      const data = await res.json();
      
      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0];
        const currentPrice = parseFloat(pair.priceUsd);
        const changePercent = ((currentPrice - item.addedPrice) / item.addedPrice) * 100;

        // Проверяем условия алерта
        if (item.alertUp && changePercent >= item.alertUp) {
          alerts.push({
            type: 'up',
            symbol: item.symbol,
            changePercent: changePercent.toFixed(2),
            currentPrice: currentPrice,
            pairAddress: item.pairAddress,
          });
        }

        if (item.alertDown && changePercent <= item.alertDown) {
          alerts.push({
            type: 'down',
            symbol: item.symbol,
            changePercent: changePercent.toFixed(2),
            currentPrice: currentPrice,
            pairAddress: item.pairAddress,
          });
        }

        // Обновляем кеш цены
        priceAlerts[item.pairAddress] = {
          lastPrice: currentPrice,
          lastCheck: Date.now(),
        };
      }
    } catch (e) {
      console.error(`[Watchlist] Error checking ${item.symbol}:`, e);
    }
  }

  // Показываем алерты пользователю
  if (alerts.length > 0) {
    showPriceAlerts(alerts);
  }

  return alerts;
}

/**
 * Показать алерты пользователю (notification или toast)
 */
function showPriceAlerts(alerts) {
  alerts.forEach(alert => {
    const emoji = alert.type === 'up' ? '📈' : '📉';
    const color = alert.type === 'up' ? '#22C55E' : '#EF4444';
    const message = `${emoji} ${alert.symbol}: ${alert.changePercent}%`;

    // Показываем toast уведомление
    showToast(message, color, () => {
      // При клике открываем токен
      window.location.hash = `#coin/${alert.pairAddress}`;
    });

    // Если доступны browser notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ORACUL Price Alert', {
        body: `${alert.symbol} изменился на ${alert.changePercent}%`,
        icon: '/logo.png',
        tag: alert.pairAddress, // предотвращает дубликаты
      });
    }
  });
}

/**
 * Показать toast уведомление
 */
function showToast(message, color = '#FF8A3D', onClick = null) {
  const toast = document.createElement('div');
  toast.className = 'price-alert-toast';
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 16px;
    background: ${color};
    color: #fff;
    padding: 14px 18px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideInRight 0.3s ease;
    cursor: pointer;
    max-width: 280px;
  `;
  toast.textContent = message;

  if (onClick) {
    toast.addEventListener('click', onClick);
  }

  document.body.appendChild(toast);

  // Автоматически удаляем через 5 секунд
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/**
 * Запросить разрешение на browser notifications
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Рендерит кнопку добавления в watchlist
 */
export function renderWatchlistButton(pair) {
  const isWatched = isInWatchlist(pair.pairAddress);
  const icon = isWatched ? '★' : '☆';
  const label = isWatched ? 'В избранном' : 'В избранное';
  const color = isWatched ? '#FFD700' : '#999';

  return `
    <button 
      class="watchlist-btn"
      data-pair-address="${pair.pairAddress}"
      onclick="window.toggleWatchlist('${pair.pairAddress}')"
      style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 8px;
        border: 1.5px solid ${isWatched ? '#FFD700' : 'var(--border)'};
        background: ${isWatched ? '#FFD70015' : 'transparent'};
        color: ${color};
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      "
      onmouseover="this.style.borderColor='#FFD700';this.style.background='#FFD70015'"
      onmouseout="this.style.borderColor='${isWatched ? '#FFD700' : 'var(--border)'}';this.style.background='${isWatched ? '#FFD70015' : 'transparent'}'"
    >
      <span style="font-size:18px">${icon}</span>
      ${label}
    </button>
  `;
}

/**
 * Рендерит страницу watchlist
 */
export async function renderWatchlistPage() {
  const container = document.getElementById('watchlistContent');
  if (!container) return;

  loadWatchlist();

  if (watchlist.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--ink-3)">
        <div style="font-size:48px;margin-bottom:16px">⭐</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">Избранное пусто</div>
        <div style="font-size:13px">Добавьте токены чтобы отслеживать их цены</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <h2 style="font-size:20px;font-weight:700;margin:0">⭐ Избранное</h2>
        <div style="font-size:12px;color:var(--ink-3);margin-top:4px">${watchlist.length} токенов</div>
      </div>
      <button onclick="window.checkWatchlistAlerts()" style="
        padding:8px 14px;
        border-radius:8px;
        border:1.5px solid var(--border);
        background:var(--surface);
        color:var(--ink-2);
        font-size:12px;
        font-weight:600;
        cursor:pointer;
      ">
        🔔 Проверить алерты
      </button>
    </div>
    <div class="watchlist-grid" style="display:flex;flex-direction:column;gap:10px">
      ${watchlist.map(item => renderWatchlistItem(item)).join('')}
    </div>
  `;
}

/**
 * Рендерит элемент watchlist
 */
function renderWatchlistItem(item) {
  const cached = priceAlerts[item.pairAddress];
  const currentPrice = cached ? cached.lastPrice : item.addedPrice;
  const changePercent = ((currentPrice - item.addedPrice) / item.addedPrice) * 100;
  const isUp = changePercent >= 0;
  const changeColor = isUp ? '#22C55E' : '#EF4444';

  return `
    <div class="watchlist-item" style="
      background:var(--surface);
      border:1.5px solid var(--border);
      border-radius:12px;
      padding:14px;
      display:flex;
      align-items:center;
      gap:12px;
      cursor:pointer;
      transition:all 0.2s;
    "
    onclick="window.location.hash='#coin/${item.pairAddress}'"
    onmouseover="this.style.borderColor='var(--orange)'"
    onmouseout="this.style.borderColor='var(--border)'"
    >
      <div style="width:40px;height:40px;border-radius:50%;background:var(--surface-2);overflow:hidden;flex-shrink:0">
        ${item.logoUrl ? `<img src="${item.logoUrl}" style="width:100%;height:100%;object-fit:cover">` : 
          `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--orange)">${item.symbol[0]}</div>`}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:15px">${item.symbol}</div>
        <div style="font-size:11px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.name}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:var(--mono);font-weight:600;font-size:14px">$${currentPrice.toFixed(6)}</div>
        <div style="font-size:12px;font-weight:600;color:${changeColor}">
          ${isUp ? '+' : ''}${changePercent.toFixed(2)}%
        </div>
      </div>
      <button 
        onclick="event.stopPropagation();window.removeFromWatchlistUI('${item.pairAddress}')"
        style="
          width:32px;
          height:32px;
          border-radius:50%;
          border:none;
          background:var(--surface-2);
          color:var(--ink-3);
          font-size:16px;
          cursor:pointer;
          flex-shrink:0;
        "
      >✕</button>
    </div>
  `;
}

// Глобальные функции для UI
window.toggleWatchlist = (pairAddress) => {
  // Используем глобальную переменную lastSelectedPair из catalog.js
  // Это более надёжно чем async import
  const currentCoin = window.lastSelectedPair;
  
  if (!currentCoin || currentCoin.pairAddress !== pairAddress) {
    console.error('[Watchlist] currentCoin not set or address mismatch');
    return;
  }

  try {
    if (isInWatchlist(pairAddress)) {
      const result = removeFromWatchlist(pairAddress);
      showToast(result.message, result.success ? '#22C55E' : '#EF4444');
    } else {
      // Показываем диалог для настройки алертов
      const alertUp = prompt('Алерт при росте на (%):', '10');
      const alertDown = prompt('Алерт при падении на (%):', '-10');
      
      const result = addToWatchlist(currentCoin, parseFloat(alertUp) || 10, parseFloat(alertDown) || -10);
      showToast(result.message, result.success ? '#22C55E' : '#EF4444');
      
      // Запрашиваем разрешение на уведомления
      if (result.success) {
        requestNotificationPermission();
      }
    }

    // Обновляем кнопку
    const btn = document.querySelector(`[data-pair-address="${pairAddress}"]`);
    if (btn && currentCoin) {
      const parent = btn.parentElement;
      btn.remove();
      parent.innerHTML += renderWatchlistButton(currentCoin);
    }
  } catch (e) {
    console.error('[Watchlist] Toggle error:', e);
    showToast('Ошибка при сохранении', '#EF4444');
  }
};

window.removeFromWatchlistUI = (pairAddress) => {
  const result = removeFromWatchlist(pairAddress);
  showToast(result.message, result.success ? '#22C55E' : '#EF4444');
  renderWatchlistPage(); // перерисовываем список
};

window.checkWatchlistAlerts = async () => {
  showToast('🔄 Проверяю цены...', '#FF8A3D');
  const alerts = await checkPriceAlerts();
  if (alerts.length === 0) {
    showToast('✓ Нет новых алертов', '#22C55E');
  }
  renderWatchlistPage(); // обновляем цены
};

// Инициализация
loadWatchlist();

// Автоматическая проверка алертов каждые 2 минуты
setInterval(() => {
  if (watchlist.length > 0) {
    checkPriceAlerts();
  }
}, 2 * 60 * 1000);

// Добавляем CSS анимации
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
