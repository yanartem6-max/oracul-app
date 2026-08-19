// smart-wallets.js — анализ "умных" кошельков (держатели, крупные покупатели)

/**
 * Получить информацию о крупных держателях токена
 * Использует DexScreener API для получения info о токене
 */
export async function getTopHolders(pairAddress, chainId = 'solana') {
  try {
    const res = await fetch(`/api/coins/${pairAddress}`);
    const data = await res.json();
    
    if (!data.pairs || data.pairs.length === 0) return null;
    
    const pair = data.pairs[0];
    
    // DexScreener возвращает базовую инфу о ликвидности
    // Для полного анализа нужно парсить на блокчейне
    return {
      pairAddress,
      tokenAddress: pair.baseToken?.address,
      chainId: pair.chainId || chainId,
      marketCap: pair.marketCap || pair.fdv || 0,
      liquidity: pair.liquidity?.usd || 0,
      volume24h: pair.volume?.h24 || 0,
      
      // Расчётные метрики из доступных данных
      estimatedHolders: estimateHolders(pair),
      holderConcentration: estimateConcentration(pair),
      largeTransactions: estimateLargeTransactions(pair),
    };
  } catch (e) {
    console.error('[SmartWallets] Error:', e);
    return null;
  }
}

/**
 * Оценить количество держателей на основе данных
 */
function estimateHolders(pair) {
  // Эвристика: если есть много транзакций и хорошая ликвидность - много держателей
  const txns = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
  const liquidity = pair.liquidity?.usd || 0;
  
  // Грубая оценка: уникальные адреса примерно = кол-во транзакций / 2
  return Math.max(10, Math.floor(txns * 0.7));
}

/**
 * Оценить концентрацию токена (насколько разредили)
 */
function estimateConcentration(pair) {
  const fdv = pair.fdv || pair.marketCap || 0;
  const liquidity = pair.liquidity?.usd || 0;
  
  // Если ликвидность <<< FDV - большая концентрация
  if (fdv === 0) return 'low'; // не знаем
  
  const ratio = liquidity / fdv;
  
  if (ratio > 0.3) return 'low'; // хорошо распределено
  if (ratio > 0.1) return 'medium'; // средняя концентрация
  return 'high'; // высокая концентрация - опасно
}

/**
 * Оценить крупные транзакции
 */
function estimateLargeTransactions(pair) {
  const volume24h = pair.volume?.h24 || 0;
  const buys = pair.txns?.h24?.buys || 1;
  const sells = pair.txns?.h24?.sells || 1;
  
  // Средний размер сделки
  const avgTradeSize = volume24h / (buys + sells);
  
  // Если средняя сделка больше $10K - это крупные покупатели
  if (avgTradeSize > 10000) return 'high';
  if (avgTradeSize > 1000) return 'medium';
  return 'low';
}

/**
 * Определить тип кошелька (based on heuristics)
 */
export function categorizeWallet(balance, txCount, avgTxSize) {
  // "Умные" кошельки - те которые успешно торгуют
  if (avgTxSize > 5000 && txCount > 50) {
    return { type: 'whale', label: '🐋 Кит', color: '#FF6B6B' };
  }
  if (avgTxSize > 1000 && txCount > 20) {
    return { type: 'smart_trader', label: '🧠 Опытный трейдер', color: '#4ECDC4' };
  }
  if (txCount > 100) {
    return { type: 'active_trader', label: '⚡ Активный трейдер', color: '#45B7D1' };
  }
  if (balance > 10000) {
    return { type: 'holder', label: '📊 Холдер', color: '#96CEB4' };
  }
  return { type: 'small_holder', label: '👤 Обычный держатель', color: '#999' };
}

/**
 * Рендерит раздел Smart Wallets в модалке токена
 */
export async function renderSmartWalletsCard(pair) {
  const data = await getTopHolders(pair.pairAddress, pair.chainId);
  
  if (!data) {
    return `
      <div style="
        background:var(--surface-2);
        border:1.5px solid var(--border);
        border-radius:12px;
        padding:12px;
        margin:12px 0;
        color:var(--ink-3);
        font-size:13px;
      ">
        ⚠️ Данные о держателях недоступны
      </div>
    `;
  }

  const concentrationIcon = 
    data.holderConcentration === 'low' ? '✅' :
    data.holderConcentration === 'medium' ? '⚠️' : '🚨';
  
  const concentrationColor =
    data.holderConcentration === 'low' ? '#22C55E' :
    data.holderConcentration === 'medium' ? '#F59E0B' : '#EF4444';

  const largeTransIcon =
    data.largeTransactions === 'high' ? '🐋' :
    data.largeTransactions === 'medium' ? '📈' : '👥';

  return `
    <div class="smart-wallets-card" style="
      background:linear-gradient(135deg, rgba(255,138,61,0.1), rgba(255,138,61,0.05));
      border:1.5px solid rgba(255,138,61,0.3);
      border-radius:12px;
      padding:14px;
      margin:12px 0;
    ">
      <div style="font-size:12px;color:var(--ink-3);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">
        🧠 Анализ держателей
      </div>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin-bottom:12px;
      ">
        <!-- Концентрация -->
        <div style="
          background:var(--surface);
          border:1.5px solid var(--border);
          border-radius:8px;
          padding:10px;
        ">
          <div style="font-size:10px;color:var(--ink-3);margin-bottom:4px">
            ${concentrationIcon} КОНЦЕНТРАЦИЯ
          </div>
          <div style="
            font-size:13px;
            font-weight:700;
            color:${concentrationColor};
            text-transform:capitalize;
          ">
            ${data.holderConcentration === 'low' ? 'Хорошая' : 
              data.holderConcentration === 'medium' ? 'Средняя' : 'Высокая'}
          </div>
          <div style="font-size:10px;color:var(--ink-3);margin-top:4px">
            Liq/$FDV: ${((data.liquidity / data.marketCap) * 100).toFixed(1)}%
          </div>
        </div>

        <!-- Крупные транзакции -->
        <div style="
          background:var(--surface);
          border:1.5px solid var(--border);
          border-radius:8px;
          padding:10px;
        ">
          <div style="font-size:10px;color:var(--ink-3);margin-bottom:4px">
            ${largeTransIcon} КРУПНЫЕ ПОКУПКИ
          </div>
          <div style="
            font-size:13px;
            font-weight:700;
            color:${data.largeTransactions === 'high' ? '#FF6B6B' : 
                    data.largeTransactions === 'medium' ? '#F59E0B' : '#22C55E'};
            text-transform:capitalize;
          ">
            ${data.largeTransactions === 'high' ? 'Частые' : 
              data.largeTransactions === 'medium' ? 'Периодические' : 'Редкие'}
          </div>
          <div style="font-size:10px;color:var(--ink-3);margin-top:4px">
            Держателей: ~${data.estimatedHolders}
          </div>
        </div>
      </div>

      <!-- Совет -->
      <div style="
        background:var(--surface-2);
        border-left:3px solid var(--orange);
        border-radius:6px;
        padding:8px;
        font-size:11px;
        color:var(--ink-2);
        line-height:1.5;
      ">
        <div style="font-weight:600;margin-bottom:4px">💡 Интерпретация:</div>
        ${getWalletInterpretation(data)}
      </div>

      <button 
        onclick="window.showDetailedWalletAnalysis('${pair.pairAddress}')"
        style="
          width:100%;
          margin-top:10px;
          padding:8px;
          border-radius:8px;
          border:1.5px solid var(--orange);
          background:transparent;
          color:var(--orange);
          font-size:12px;
          font-weight:600;
          cursor:pointer;
          transition:all 0.2s;
        "
        onmouseover="this.style.background='var(--orange)';this.style.color='#fff'"
        onmouseout="this.style.background='transparent';this.style.color='var(--orange)'"
      >
        📊 Подробный анализ
      </button>
    </div>
  `;
}

/**
 * Интерпретация данных о кошельках
 */
function getWalletInterpretation(data) {
  const insights = [];

  // Анализируем концентрацию
  if (data.holderConcentration === 'high') {
    insights.push('⚠️ Токен сосредоточен у немногих кошельков - риск дампа');
  } else if (data.holderConcentration === 'medium') {
    insights.push('✓ Разумное распределение, но есть крупные держатели');
  } else {
    insights.push('✅ Хорошо распределён между держателями');
  }

  // Анализируем транзакции
  if (data.largeTransactions === 'high') {
    insights.push('🐋 Видны крупные покупатели/киты - хороший знак активности');
  } else if (data.largeTransactions === 'medium') {
    insights.push('📈 Средний размер сделок, смешанная активность');
  } else {
    insights.push('👥 В основном розничные/мелкие держатели');
  }

  return insights.map(i => `<div>${i}</div>`).join('');
}

/**
 * Показать детальный анализ
 */
window.showDetailedWalletAnalysis = async (pairAddress) => {
  const data = await getTopHolders(pairAddress);
  
  if (!data) {
    alert('Не удалось получить данные');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.style.zIndex = '10000';
  modal.innerHTML = `
    <div class="modal-card" style="max-height:80vh;overflow-y:auto">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="font-size:18px;font-weight:700;margin-bottom:16px">🧠 Детальный анализ держателей</h2>
      
      <div style="display:flex;flex-direction:column;gap:12px">
        <!-- Market Cap -->
        <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:12px;padding:12px">
          <div style="font-size:11px;color:var(--ink-3);margin-bottom:4px">Market Cap</div>
          <div style="font-size:16px;font-weight:700">$${(data.marketCap || 0).toLocaleString('en-US', {maximumFractionDigits:0})}</div>
        </div>

        <!-- Liquidity -->
        <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:12px;padding:12px">
          <div style="font-size:11px;color:var(--ink-3);margin-bottom:4px">Liquidity (USD)</div>
          <div style="font-size:16px;font-weight:700">$${(data.liquidity || 0).toLocaleString('en-US', {maximumFractionDigits:0})}</div>
          <div style="font-size:11px;color:var(--ink-3);margin-top:4px">
            ${data.marketCap > 0 ? `${((data.liquidity / data.marketCap) * 100).toFixed(1)}% от FDV` : 'N/A'}
          </div>
        </div>

        <!-- Volume 24h -->
        <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:12px;padding:12px">
          <div style="font-size:11px;color:var(--ink-3);margin-bottom:4px">Volume 24h</div>
          <div style="font-size:16px;font-weight:700">$${(data.volume24h || 0).toLocaleString('en-US', {maximumFractionDigits:0})}</div>
        </div>

        <!-- Estimated Holders -->
        <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:12px;padding:12px">
          <div style="font-size:11px;color:var(--ink-3);margin-bottom:4px">Примерное кол-во держателей</div>
          <div style="font-size:16px;font-weight:700">~${data.estimatedHolders}</div>
          <div style="font-size:11px;color:var(--ink-3);margin-top:4px">
            Оценка на основе активности и ликвидности
          </div>
        </div>

        <!-- Recommendations -->
        <div style="
          background:linear-gradient(135deg, rgba(255,193,7,0.1), rgba(255,193,7,0.05));
          border:1.5px solid rgba(255,193,7,0.3);
          border-radius:12px;
          padding:12px;
        ">
          <div style="font-size:12px;font-weight:700;margin-bottom:8px">💡 Рекомендации:</div>
          <ul style="margin:0;padding-left:20px;font-size:12px;line-height:1.8;color:var(--ink-2)">
            <li>Избегайте покупок если концентрация ВЫСОКАЯ</li>
            <li>Ищите токены с хорошей ликвидностью (>10% от FDV)</li>
            <li>Предпочитайте токены с крупными регулярными покупками</li>
            <li>Проверяйте все сигналы вместе - один не решает</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
};
