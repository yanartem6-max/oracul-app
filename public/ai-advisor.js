// ai-advisor.js — AI помощник для анализа токенов и торговли

import { calculateRiskScore, checkHoneypot, generateRiskExplanation } from './risk-analyzer.js';
import { getPortfolioStats } from './portfolio.js';
import { getTopHolders } from './smart-wallets.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

/**
 * Получить AI анализ токена
 */
export async function getTokenAnalysis(pair) {
  const riskData = calculateRiskScore(pair);
  const honeypot = checkHoneypot(pair);
  const holders = await getTopHolders(pair.pairAddress, pair.chainId);

  const prompt = `
Проанализируй этот мем-коин и дай честную оценку:

Токен: ${pair.baseToken?.symbol}
Цена: $${pair.priceUsd}
FDV: $${pair.fdv || 0}
Ликвидность: $${pair.liquidity?.usd || 0}
Объём 24ч: $${pair.volume?.h24 || 0}
Возраст: ${pair.pairCreatedAt ? Math.floor((Date.now() - pair.pairCreatedAt) / 86400000) + ' дней' : 'неизвестно'}

Риск скор: ${riskData.score}/100 (${riskData.riskLabel})
Honeypot риск: ${honeypot.isHoneypot ? 'ВЫСОКИЙ' : 'нормальный'}
Концентрация: ${holders?.holderConcentration || 'unknown'}

Проблемы: ${riskData.issues.join(', ') || 'нет'}
Предупреждения: ${riskData.warnings.join(', ') || 'нет'}

Дай краткий анализ (3-4 предложения):
- Стоит ли входить СЕЙЧАС?
- Главные риски?
- Когда может выстрелить?

Будь честен - это не финансовый совет, а анализ рисков.
  `;

  try {
    const analysis = await callGroqAPI(prompt);
    return {
      success: true,
      analysis,
      riskScore: riskData.score,
      isHoneypot: honeypot.isHoneypot,
    };
  } catch (e) {
    console.error('[AIAdvisor] Error:', e);
    return {
      success: false,
      analysis: 'Не смог получить анализ. Попробуй позже.',
      error: e.message,
    };
  }
}

/**
 * Анализ твоего портфеля через ИИ
 */
export async function analyzePortfolio() {
  const stats = getPortfolioStats();

  if (stats.totalTrades === 0) {
    return 'У тебя ещё нет сделок. Начни торговать и я смогу анализировать твои паттерны!';
  }

  const prompt = `
Я трейдер и вот моя статистика торговли:

Всего сделок: ${stats.totalTrades}
Покупок: ${stats.buyCount}
Продаж: ${stats.sellCount}
Всего куплено: $${stats.totalBought.toFixed(2)}
Всего продано: $${stats.totalSold.toFixed(2)}
Комиссии: $${stats.totalFees.toFixed(2)}
Реализованная прибыль: $${stats.realizedPnL.toFixed(2)}

Дай мне честный анализ (2-3 предложения):
- Какой мой стиль торговли?
- Основные ошибки?
- Как улучшиться?

Основывайся только на переданных данных.
  `;

  try {
    const analysis = await callGroqAPI(prompt);
    return analysis;
  } catch (e) {
    console.error('[AIAdvisor] Portfolio analysis error:', e);
    return 'Не смог проанализировать портфель. Попробуй позже.';
  }
}

/**
 * Получить совет о риске/FOMO
 */
export async function getFOMOWarning(pair, portfolio) {
  const recentLosses = calculateRecentLosses(portfolio);
  const riskScore = calculateRiskScore(pair).score;

  const prompt = `
Пользователь хочет купить ${pair.baseToken?.symbol} по цене $${pair.priceUsd}.

Его последние торги показывают, что он потерял ~$${recentLosses} в последних 3 сделках.
Риск скор этого токена: ${riskScore}/100.

Дай ЧЕСТНЫЙ совет (1-2 предложения):
- Это хорошее время для входа?
- Стоит ли рискнуть сейчас?
- Какой максимум можно инвестировать?

Основная цель - защитить от FOMO и плохих решений.
  `;

  try {
    const advice = await callGroqAPI(prompt);
    return advice;
  } catch (e) {
    console.error('[AIAdvisor] FOMO warning error:', e);
    return 'Будь осторожен - проверь риск скор перед входом.';
  }
}

/**
 * Вызов Groq API
 */
async function callGroqAPI(prompt) {
  if (!GROQ_API_KEY) {
    // Для демо возвращаем готовый ответ
    return generateDemoAnalysis(prompt);
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: 'Ты - опытный крипто-трейдер и аналитик. Даёшь честные, безопасные советы по мем-коинам. Всегда предупреждаешь о рисках.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const data = await res.json();
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content;
    }
    throw new Error('Invalid API response');
  } catch (e) {
    console.error('[Groq API Error]:', e);
    throw e;
  }
}

/**
 * Генерировать демо анализ (для тестирования без API ключа)
 */
function generateDemoAnalysis(prompt) {
  // Простой демо ответ на основе ключевых слов
  if (prompt.includes('Риск скор')) {
    return '🎯 Анализ:\n\n✓ Токен выглядит интересно, но помни:\n- Мем-коины = высокий риск\n- Ликвидность хорошая, это плюс\n- Но концентрация токена может быть проблемой\n\n💡 Рекомендация: Входи с маленьким позиционом (1-2% портфеля), не всё сразу.';
  }
  if (prompt.includes('Всего сделок')) {
    return '📊 Анализ твоей торговли:\n\n• Ты часто торгуешь (позитив - активность)\n• Но может быть много импульсивных входов\n• Попробуй ждать подтверждений дольше\n\n🎯 Совет: Снизь кол-во сделок, повыси их качество.';
  }
  if (prompt.includes('FOMO')) {
    return '⚠️ Совет по FOMO:\n\n❌ НЕ входи просто потому что видишь рост\n✓ Проверь риск скор перед свапом\n💡 Если скор < 30, подожди подтверждений\n\n📈 Входи на отскоке, не на вершине!';
  }
  return '🤔 Попробуй снова с более конкретным вопросом!';
}

/**
 * Рассчитать недавние потери
 */
function calculateRecentLosses(portfolio) {
  if (!portfolio || !portfolio.trades) return 0;
  
  const recentTrades = portfolio.trades
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  let losses = 0;
  for (const trade of recentTrades) {
    if (trade.type === 'sell' && trade.pnl < 0) {
      losses += Math.abs(trade.pnl);
    }
  }
  return losses;
}

/**
 * Рендерит UI для запроса AI анализа
 */
export function renderAIAdvisorButtons(pair) {
  return `
    <div style="
      display:flex;
      gap:8px;
      margin:12px 0;
      flex-wrap:wrap;
    ">
      <button 
        onclick="window.requestAIAnalysis('${pair.pairAddress}', this)"
        style="
          flex:1;
          min-width:120px;
          padding:10px;
          border-radius:8px;
          border:1.5px solid #4ECDC4;
          background:transparent;
          color:#4ECDC4;
          font-size:12px;
          font-weight:600;
          cursor:pointer;
          transition:all 0.2s;
        "
        onmouseover="this.style.background='#4ECDC4';this.style.color='#fff'"
        onmouseout="this.style.background='transparent';this.style.color='#4ECDC4'"
      >
        🤖 AI Анализ
      </button>
      <button 
        onclick="window.requestFOMOAdvice('${pair.pairAddress}', this)"
        style="
          flex:1;
          min-width:120px;
          padding:10px;
          border-radius:8px;
          border:1.5px solid #FFD700;
          background:transparent;
          color:#FFD700;
          font-size:12px;
          font-weight:600;
          cursor:pointer;
          transition:all 0.2s;
        "
        onmouseover="this.style.background='#FFD700';this.style.color='#000'"
        onmouseout="this.style.background='transparent';this.style.color='#FFD700'"
      >
        ⚠️ FOMO Check
      </button>
    </div>
  `;
}

// Глобальные функции для UI
window.requestAIAnalysis = async (pairAddress, btn) => {
  const currentCoin = window.lastSelectedPair;
  if (!currentCoin || currentCoin.pairAddress !== pairAddress) {
    console.error('[AI] currentCoin not set or address mismatch', { pairAddress, current: currentCoin?.pairAddress });
    alert('Ошибка: токен не загружен. Откройте модал снова.');
    return;
  }

  if (!btn) {
    console.error('[AI] Button element not provided');
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Анализ...';

  try {
    console.log('[AI] Starting analysis for:', currentCoin.baseToken?.symbol);
    const result = await getTokenAnalysis(currentCoin);
    console.log('[AI] Analysis result:', result);
    
    if (result.success) {
      showAIModal('🤖 AI Анализ токена', result.analysis);
    } else {
      alert('Ошибка: ' + (result.error || 'неизвестная ошибка'));
    }
  } catch (e) {
    console.error('[AI] Analysis error:', e);
    alert('Ошибка при получении анализа: ' + e.message);
  }

  btn.disabled = false;
  btn.textContent = originalText;
};

window.requestFOMOAdvice = async (pairAddress, btn) => {
  const currentCoin = window.lastSelectedPair;
  if (!currentCoin || currentCoin.pairAddress !== pairAddress) {
    console.error('[FOMO] currentCoin not set or address mismatch');
    alert('Ошибка: токен не загружен. Откройте модал снова.');
    return;
  }

  if (!btn) {
    console.error('[FOMO] Button element not provided');
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Проверка...';

  try {
    console.log('[FOMO] Starting FOMO check for:', currentCoin.baseToken?.symbol);
    const portfolio = {}; // Пустой портфель если нет данных
    const advice = await getFOMOWarning(currentCoin, portfolio);
    console.log('[FOMO] Advice result:', advice);
    showAIModal('⚠️ FOMO Проверка', advice);
  } catch (e) {
    console.error('[FOMO] FOMO error:', e);
    alert('Ошибка при проверке FOMO: ' + e.message);
  }

  btn.disabled = false;
  btn.textContent = originalText;
};

window.requestPortfolioAnalysis = async () => {
  const analysis = await analyzePortfolio();
  showAIModal('📊 Анализ твоего портфеля', analysis);
};

/**
 * Показать модал с AI анализом
 */
function showAIModal(title, content) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.style.zIndex = '10000';
  modal.innerHTML = `
    <div class="modal-card">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="font-size:18px;font-weight:700;margin-bottom:14px">${title}</h2>
      <div style="
        background:var(--surface-2);
        border:1.5px solid var(--border);
        border-radius:12px;
        padding:16px;
        font-size:13px;
        line-height:1.8;
        color:var(--ink-2);
        white-space:pre-wrap;
        word-break:break-word;
        max-height:60vh;
        overflow-y:auto;
      ">
        ${content.replace(/\n/g, '<br/>')}
      </div>
      <button 
        onclick="this.closest('.modal-overlay').remove()"
        style="
          width:100%;
          margin-top:14px;
          padding:10px;
          border-radius:8px;
          border:1.5px solid var(--orange);
          background:transparent;
          color:var(--orange);
          font-weight:600;
          cursor:pointer;
        "
      >
        Закрыть
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}


/**
 * Открыть график в полноэкранном режиме
 */
window.openFullscreenChart = async (pair) => {
  if (!pair) {
    alert('Токен не загружен');
    return;
  }

  // Создаём модал для полноэкранного графика
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.style.zIndex = '11000';
  modal.style.background = 'rgba(0,0,0,.95)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  
  modal.innerHTML = `
    <div style="
      position: relative;
      width: 96vw;
      height: 90vh;
      background: var(--surface);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
    ">
      <!-- Закрыть -->
      <button 
        onclick="this.closest('.modal-overlay').remove()"
        style="
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--orange);
          color: #fff;
          border: none;
          font-size: 20px;
          cursor: pointer;
          z-index: 1;
          transition: background 0.2s;
        "
        onmouseover="this.style.background='var(--orange-dk)'"
        onmouseout="this.style.background='var(--orange)'"
      >
        ✕
      </button>

      <!-- Заголовок -->
      <div style="
        padding: 16px;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        gap: 12px;
      ">
        <div style="flex: 1">
          <h2 style="font-size: 20px; font-weight: 700; margin: 0">
            ${pair.baseToken?.name || '?'} · ${pair.baseToken?.symbol || '?'}
          </h2>
          <p style="font-size: 12px; color: var(--ink-3); margin: 4px 0 0">
            ${(pair.chainId || '').toUpperCase()} • ${pair.pairAddress?.slice(-6).toUpperCase()}
          </p>
        </div>
        <div style="text-align: right">
          <div style="font-size: 18px; font-weight: 700">${window.fmtPrice?.(pair.priceUsd) || '—'}</div>
        </div>
      </div>

      <!-- Вкладки разрешений -->
      <div style="
        display: flex;
        gap: 4px;
        padding: 8px 16px;
        border-bottom: 1px solid var(--border);
        overflow-x: auto;
      ">
        <button class="chart-tab-btn" data-res="60" onclick="window.reloadFullscreenChart(this, 60, '${pair.chainId}', '${pair.pairAddress}')">1H</button>
        <button class="chart-tab-btn" data-res="240" onclick="window.reloadFullscreenChart(this, 240, '${pair.chainId}', '${pair.pairAddress}')">4H</button>
        <button class="chart-tab-btn active" data-res="1440" onclick="window.reloadFullscreenChart(this, 1440, '${pair.chainId}', '${pair.pairAddress}')">1D</button>
        <button class="chart-tab-btn" data-res="0" onclick="window.reloadFullscreenChart(this, 0, '${pair.chainId}', '${pair.pairAddress}')">ALL</button>
      </div>

      <!-- Контейнер графика -->
      <div id="fullscreenChartContainer" style="
        flex: 1;
        overflow: hidden;
        position: relative;
        background: rgba(255,138,61,.01);
      ">
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-3);
          font-size: 14px;
        ">
          ⏳ Загрузка графика...
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Загружаем график
  setTimeout(async () => {
    const { initChart } = await import('./catalog.js?v=17');
    await initChart(pair, document.getElementById('fullscreenChartContainer'), true);
  }, 100);
};

/**
 * Перезагрузить график при смене разрешения
 */
window.reloadFullscreenChart = async (btn, resolution, chainId, pairAddress) => {
  // Обновляем активную кнопку
  document.querySelectorAll('[data-res]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Загружаем новый график
  const container = document.getElementById('fullscreenChartContainer');
  if (!container) return;

  container.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--ink-3)">⏳</div>';

  try {
    const { initChart } = await import('./catalog.js?v=17');
    const pair = window.lastSelectedPair;
    if (pair) {
      await initChart(pair, container, true, resolution);
    }
  } catch (e) {
    console.error('[Fullscreen Chart] Error:', e);
    container.innerHTML = '<div style="color:var(--red);padding:20px">Ошибка загрузки графика</div>';
  }
};
