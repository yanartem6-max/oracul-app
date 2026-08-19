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
        onclick="window.requestAIAnalysis('${pair.pairAddress}')"
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
        onclick="window.requestFOMOAdvice('${pair.pairAddress}')"
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
window.requestAIAnalysis = async (pairAddress) => {
  const { currentCoin } = await import('./catalog.js');
  if (!currentCoin || currentCoin.pairAddress !== pairAddress) return;

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '⏳ Анализ...';

  try {
    const result = await getTokenAnalysis(currentCoin);
    if (result.success) {
      showAIModal('🤖 AI Анализ токена', result.analysis);
    } else {
      alert('Ошибка: ' + result.error);
    }
  } catch (e) {
    alert('Ошибка при получении анализа');
  }

  btn.disabled = false;
  btn.textContent = '🤖 AI Анализ';
};

window.requestFOMOAdvice = async (pairAddress) => {
  const { currentCoin } = await import('./catalog.js');
  if (!currentCoin || currentCoin.pairAddress !== pairAddress) return;

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '⏳ Проверка...';

  try {
    const { getPortfolio } = await import('./portfolio.js');
    const portfolio = getPortfolio?.();
    const advice = await getFOMOWarning(currentCoin, portfolio);
    showAIModal('⚠️ FOMO Проверка', advice);
  } catch (e) {
    alert('Ошибка при проверке FOMO');
  }

  btn.disabled = false;
  btn.textContent = '⚠️ FOMO Check';
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
