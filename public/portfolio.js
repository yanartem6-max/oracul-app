// portfolio.js — отслеживание портфеля с P&L (profit/loss)

const PORTFOLIO_KEY = 'oracul_portfolio';
const TRADES_KEY = 'oracul_trades';

// Структура портфеля: { tokenAddress: { symbol, amount, avgBuyPrice, totalInvested, trades[] } }
let portfolio = {};
let trades = []; // История всех сделок

/**
 * Загрузить портфель из localStorage
 */
export function loadPortfolio() {
  try {
    const storedPortfolio = localStorage.getItem(PORTFOLIO_KEY);
    const storedTrades = localStorage.getItem(TRADES_KEY);
    
    portfolio = storedPortfolio ? JSON.parse(storedPortfolio) : {};
    trades = storedTrades ? JSON.parse(storedTrades) : [];
    
    return { portfolio, trades };
  } catch (e) {
    console.error('[Portfolio] Load error:', e);
    return { portfolio: {}, trades: [] };
  }
}

/**
 * Сохранить портфель в localStorage
 */
function savePortfolio() {
  try {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
    localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
  } catch (e) {
    console.error('[Portfolio] Save error:', e);
  }
}

/**
 * Добавить сделку (покупка или продажа)
 */
export function addTrade(type, tokenAddress, symbol, amount, price, fees = 0) {
  const trade = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    type, // 'buy' или 'sell'
    tokenAddress,
    symbol,
    amount: parseFloat(amount),
    price: parseFloat(price),
    fees: parseFloat(fees),
    total: parseFloat(amount) * parseFloat(price),
    timestamp: Date.now(),
  };

  trades.push(trade);

  // Обновляем портфель
  if (!portfolio[tokenAddress]) {
    portfolio[tokenAddress] = {
      symbol,
      tokenAddress,
      amount: 0,
      avgBuyPrice: 0,
      totalInvested: 0,
      trades: [],
    };
  }

  const position = portfolio[tokenAddress];
  position.trades.push(trade.id);

  if (type === 'buy') {
    // Пересчитываем среднюю цену покупки
    const prevTotal = position.avgBuyPrice * position.amount;
    const newTotal = prevTotal + trade.total;
    position.amount += trade.amount;
    position.avgBuyPrice = position.amount > 0 ? newTotal / position.amount : 0;
    position.totalInvested += trade.total + fees;
  } else if (type === 'sell') {
    position.amount -= trade.amount;
    // Если продали все - обнуляем позицию
    if (position.amount <= 0) {
      delete portfolio[tokenAddress];
    }
  }

  savePortfolio();
  return trade;
}

/**
 * Получить текущую стоимость портфеля (требует текущих цен)
 */
export async function calculatePortfolioValue() {
  const positions = Object.values(portfolio);
  if (positions.length === 0) return { totalValue: 0, totalPnL: 0, positions: [] };

  const results = [];
  let totalValue = 0;
  let totalPnL = 0;

  for (const pos of positions) {
    try {
      // Получаем текущую цену токена
      const res = await fetch(`/api/coins/${pos.tokenAddress}`);
      const data = await res.json();
      
      let currentPrice = 0;
      if (data.pairs && data.pairs.length > 0) {
        currentPrice = parseFloat(data.pairs[0].priceUsd) || 0;
      }

      const currentValue = pos.amount * currentPrice;
      const pnl = currentValue - pos.totalInvested;
      const pnlPercent = pos.totalInvested > 0 ? (pnl / pos.totalInvested) * 100 : 0;

      totalValue += currentValue;
      totalPnL += pnl;

      results.push({
        ...pos,
        currentPrice,
        currentValue,
        pnl,
        pnlPercent,
      });
    } catch (e) {
      console.error(`[Portfolio] Error fetching price for ${pos.symbol}:`, e);
      // Добавляем с нулевыми значениями
      results.push({
        ...pos,
        currentPrice: 0,
        currentValue: 0,
        pnl: -pos.totalInvested,
        pnlPercent: -100,
      });
    }
  }

  return {
    totalValue,
    totalPnL,
    totalPnLPercent: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0,
    positions: results,
  };
}

/**
 * Получить статистику портфеля
 */
export function getPortfolioStats() {
  const buyTrades = trades.filter(t => t.type === 'buy');
  const sellTrades = trades.filter(t => t.type === 'sell');

  const totalBought = buyTrades.reduce((sum, t) => sum + t.total, 0);
  const totalSold = sellTrades.reduce((sum, t) => sum + t.total, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);

  return {
    totalTrades: trades.length,
    buyCount: buyTrades.length,
    sellCount: sellTrades.length,
    totalBought,
    totalSold,
    totalFees,
    realizedPnL: totalSold - totalBought - totalFees, // Только закрытые позиции
  };
}

/**
 * Рендерит страницу Portfolio
 */
export async function renderPortfolioPage() {
  const container = document.getElementById('portfolioContent');
  if (!container) return;

  loadPortfolio();

  // Показываем loader
  container.innerHTML = `
    <div style="text-align:center;padding:40px;color:var(--ink-3)">
      <div style="font-size:24px;margin-bottom:8px">⏳</div>
      <div style="font-size:13px">Загрузка портфеля...</div>
    </div>
  `;

  const portfolioData = await calculatePortfolioValue();
  const stats = getPortfolioStats();

  if (portfolioData.positions.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--ink-3)">
        <div style="font-size:48px;margin-bottom:16px">💼</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">Портфель пуст</div>
        <div style="font-size:13px">Купите токены чтобы отслеживать P&L</div>
      </div>
    `;
    return;
  }

  const isProfitable = portfolioData.totalPnL >= 0;
  const pnlColor = isProfitable ? '#22C55E' : '#EF4444';
  const pnlIcon = isProfitable ? '📈' : '📉';

  container.innerHTML = `
    <div>
      <!-- Общая статистика -->
      <div style="
        background:linear-gradient(135deg, ${pnlColor}15, ${pnlColor}05);
        border:2px solid ${pnlColor}40;
        border-radius:16px;
        padding:20px;
        margin-bottom:16px;
      ">
        <div style="font-size:12px;color:var(--ink-3);margin-bottom:4px">💼 ПОРТФЕЛЬ</div>
        <div style="font-family:var(--mono);font-size:32px;font-weight:700;margin-bottom:12px">
          $${portfolioData.totalValue.toFixed(2)}
        </div>
        <div style="display:flex;align-items:center;gap:12px;font-size:14px">
          <div style="font-weight:700;color:${pnlColor}">
            ${pnlIcon} ${isProfitable ? '+' : ''}$${portfolioData.totalPnL.toFixed(2)}
          </div>
          <div style="
            padding:4px 10px;
            border-radius:6px;
            background:${pnlColor}20;
            color:${pnlColor};
            font-weight:600;
            font-size:12px;
          ">
            ${isProfitable ? '+' : ''}${portfolioData.totalPnLPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <!-- Быстрая статистика -->
      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin-bottom:16px;
      ">
        <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:12px;padding:14px">
          <div style="font-size:11px;color:var(--ink-3);margin-bottom:4px">Всего сделок</div>
          <div style="font-size:20px;font-weight:700">${stats.totalTrades}</div>
        </div>
        <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:12px;padding:14px">
          <div style="font-size:11px;color:var(--ink-3);margin-bottom:4px">Комиссии</div>
          <div style="font-size:20px;font-weight:700;color:var(--orange)">$${stats.totalFees.toFixed(2)}</div>
        </div>
      </div>

      <!-- Позиции -->
      <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <h3 style="font-size:16px;font-weight:700;margin:0">📊 Позиции (${portfolioData.positions.length})</h3>
        <button onclick="window.showTradeHistory()" style="
          padding:6px 12px;
          border-radius:6px;
          border:1.5px solid var(--border);
          background:var(--surface);
          color:var(--ink-2);
          font-size:11px;
          font-weight:600;
          cursor:pointer;
        ">История</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px">
        ${portfolioData.positions.map(pos => renderPortfolioPosition(pos)).join('')}
      </div>
    </div>
  `;
}

/**
 * Рендерит одну позицию портфеля
 */
function renderPortfolioPosition(pos) {
  const isProfitable = pos.pnl >= 0;
  const pnlColor = isProfitable ? '#22C55E' : '#EF4444';

  return `
    <div style="
      background:var(--surface);
      border:1.5px solid var(--border);
      border-radius:12px;
      padding:14px;
      cursor:pointer;
      transition:all 0.2s;
    "
    onclick="window.location.hash='#coin/${pos.tokenAddress}'"
    onmouseover="this.style.borderColor='var(--orange)'"
    onmouseout="this.style.borderColor='var(--border)'"
    >
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
        <div>
          <div style="font-weight:700;font-size:15px">${pos.symbol}</div>
          <div style="font-size:11px;color:var(--ink-3)">${pos.amount.toFixed(4)} токенов</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--mono);font-weight:600;font-size:14px">
            $${pos.currentValue.toFixed(2)}
          </div>
          <div style="font-size:11px;color:var(--ink-3)">
            @$${pos.currentPrice.toFixed(6)}
          </div>
        </div>
      </div>

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding-top:10px;
        border-top:1px solid var(--border);
      ">
        <div>
          <div style="font-size:11px;color:var(--ink-3)">Средняя цена</div>
          <div style="font-size:12px;font-weight:600">$${pos.avgBuyPrice.toFixed(6)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:12px;font-weight:700;color:${pnlColor}">
            ${isProfitable ? '+' : ''}$${pos.pnl.toFixed(2)}
          </div>
          <div style="
            display:inline-block;
            padding:2px 8px;
            border-radius:4px;
            background:${pnlColor}15;
            color:${pnlColor};
            font-size:11px;
            font-weight:600;
            margin-top:2px;
          ">
            ${isProfitable ? '+' : ''}${pos.pnlPercent.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Показать историю сделок
 */
window.showTradeHistory = () => {
  loadPortfolio();

  if (trades.length === 0) {
    alert('История сделок пуста');
    return;
  }

  // Сортируем от новых к старым
  const sortedTrades = [...trades].sort((a, b) => b.timestamp - a.timestamp);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.style.zIndex = '10000';
  modal.innerHTML = `
    <div class="modal-card" style="max-height:80vh;overflow-y:auto">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="font-size:18px;font-weight:700;margin-bottom:16px">📋 История сделок (${trades.length})</h2>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${sortedTrades.map(trade => {
          const isBuy = trade.type === 'buy';
          const color = isBuy ? '#22C55E' : '#EF4444';
          const icon = isBuy ? '↗' : '↘';
          const date = new Date(trade.timestamp).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });

          return `
            <div style="
              background:var(--surface-2);
              border-radius:8px;
              padding:12px;
              border-left:3px solid ${color};
            ">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <div style="font-weight:700;color:${color}">
                  ${icon} ${isBuy ? 'КУПИЛ' : 'ПРОДАЛ'} ${trade.symbol}
                </div>
                <div style="font-size:11px;color:var(--ink-3)">${date}</div>
              </div>
              <div style="font-size:12px;color:var(--ink-2)">
                ${trade.amount.toFixed(4)} × $${trade.price.toFixed(6)} = <b>$${trade.total.toFixed(2)}</b>
              </div>
              ${trade.fees > 0 ? `<div style="font-size:11px;color:var(--ink-3)">Комиссия: $${trade.fees.toFixed(2)}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
};

// Инициализация
loadPortfolio();
