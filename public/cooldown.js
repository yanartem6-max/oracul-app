// cooldown.js — защита от импульсивных сделок

const COOLDOWN_KEY = 'oracul_cooldowns';
const DAILY_LIMIT_KEY = 'oracul_daily_limits';

/**
 * Получить cooldown-ы пользователя
 */
export function getCooldowns() {
  try {
    const stored = localStorage.getItem(COOLDOWN_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('[Cooldown] Load error:', e);
    return {};
  }
}

/**
 * Сохранить cooldown-ы
 */
function saveCooldowns(cooldowns) {
  localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldowns));
}

/**
 * Проверить если ли активный cooldown для токена
 */
export function checkCooldown(tokenAddress) {
  const cooldowns = getCooldowns();
  const cooldown = cooldowns[tokenAddress];

  if (!cooldown) return { active: false, remaining: 0 };

  const elapsed = Date.now() - cooldown.startedAt;
  const remaining = Math.max(0, cooldown.duration - elapsed);

  if (remaining === 0) {
    delete cooldowns[tokenAddress];
    saveCooldowns(cooldowns);
    return { active: false, remaining: 0 };
  }

  return {
    active: true,
    remaining,
    durationSeconds: cooldown.duration / 1000,
    reason: cooldown.reason,
  };
}

/**
 * Установить cooldown на токен (защита от повторной покупки)
 */
export function setCooldown(tokenAddress, durationSeconds = 300, reason = 'Ждите перед повторной покупкой') {
  const cooldowns = getCooldowns();
  cooldowns[tokenAddress] = {
    startedAt: Date.now(),
    duration: durationSeconds * 1000,
    reason,
  };
  saveCooldowns(cooldowns);
}

/**
 * Получить daily loss limit
 */
export function getDailyLimit() {
  try {
    const stored = localStorage.getItem(DAILY_LIMIT_KEY);
    if (!stored) return getDefaultLimit();
    
    const data = JSON.parse(stored);
    // Если день новый - сбрасываем лимит
    if (isNewDay(data.date)) {
      return getDefaultLimit();
    }
    return data;
  } catch (e) {
    return getDefaultLimit();
  }
}

/**
 * Получить лимит по умолчанию
 */
function getDefaultLimit() {
  return {
    maxDailyLoss: 500, // $500 в день
    maxSingleTrade: 100, // $100 на одну сделку
    maxTradesPerDay: 10, // 10 сделок в день
    date: new Date().toDateString(),
    currentLoss: 0,
    tradesCount: 0,
  };
}

/**
 * Проверить если ли новый день
 */
function isNewDay(dateStr) {
  return dateStr !== new Date().toDateString();
}

/**
 * Добавить потерю в дневной лимит
 */
export function addDailyLoss(amount) {
  const limit = getDailyLimit();
  limit.currentLoss += amount;
  saveDailyLimit(limit);
  return limit;
}

/**
 * Увеличить счётчик сделок за день
 */
export function incrementDailyTrades() {
  const limit = getDailyLimit();
  limit.tradesCount++;
  saveDailyLimit(limit);
  return limit;
}

/**
 * Сохранить daily limit
 */
function saveDailyLimit(limit) {
  localStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify(limit));
}

/**
 * Проверить если ли нарушение лимитов
 */
export function checkLimits(tradeAmount, riskScore) {
  const limit = getDailyLimit();
  const violations = [];

  // Проверка дневного лимита потерь
  if (limit.currentLoss >= limit.maxDailyLoss) {
    violations.push({
      type: 'daily_loss_limit',
      message: `Ты уже потерял $${limit.currentLoss.toFixed(2)} сегодня. Лимит: $${limit.maxDailyLoss}`,
      severity: 'critical',
    });
  }

  // Проверка лимита одной сделки
  if (tradeAmount > limit.maxSingleTrade) {
    violations.push({
      type: 'single_trade_limit',
      message: `Лимит одной сделки: $${limit.maxSingleTrade}. Ты вводишь $${tradeAmount.toFixed(2)}.`,
      severity: 'high',
      suggestion: `Максимум можешь потратить: $${limit.maxSingleTrade}`,
    });
  }

  // Проверка кол-ва сделок в день
  if (limit.tradesCount >= limit.maxTradesPerDay) {
    violations.push({
      type: 'daily_trades_limit',
      message: `Ты уже сделал ${limit.tradesCount} сделок сегодня. Лимит: ${limit.maxTradesPerDay}.`,
      severity: 'medium',
    });
  }

  // Проверка риска + кол-во потерь (эвристика)
  if (riskScore < 30 && limit.currentLoss > limit.maxDailyLoss * 0.5) {
    violations.push({
      type: 'risk_score_alert',
      message: `⚠️ Ты торгуешь высоко-рисковыми токенами и уже потерял много. Стоп!`,
      severity: 'high',
    });
  }

  return violations;
}

/**
 * Рендерит UI для настройки лимитов
 */
export function renderLimitSettings() {
  const limit = getDailyLimit();

  return `
    <div style="
      background:linear-gradient(135deg, rgba(255,193,7,0.1), rgba(255,193,7,0.05));
      border:1.5px solid rgba(255,193,7,0.3);
      border-radius:12px;
      padding:14px;
      margin:12px 0;
    ">
      <div style="font-size:13px;font-weight:700;margin-bottom:12px">🛡️ Защита от FOMO</div>
      
      <div style="display:flex;flex-direction:column;gap:10px">
        <!-- Дневной лимит потерь -->
        <div>
          <div style="font-size:11px;color:var(--ink-3);margin-bottom:4px">
            Макс. потеря в день: $${limit.maxDailyLoss}
            <span style="color:#FF6B6B;font-weight:700"> (уже $${limit.currentLoss.toFixed(2)})</span>
          </div>
          <input 
            type="range" 
            min="100" 
            max="10000" 
            value="${limit.maxDailyLoss}"
            step="100"
            onchange="window.updateDailyLimit(this.value)"
            style="width:100%;cursor:pointer"
          />
        </div>

        <!-- Лимит одной сделки -->
        <div>
          <div style="font-size:11px;color:var(--ink-3);margin-bottom:4px">
            Макс. одна сделка: $${limit.maxSingleTrade}
          </div>
          <input 
            type="range" 
            min="10" 
            max="1000" 
            value="${limit.maxSingleTrade}"
            step="10"
            onchange="window.updateSingleTrade(this.value)"
            style="width:100%;cursor:pointer"
          />
        </div>

        <!-- Кол-во сделок в день -->
        <div>
          <div style="font-size:11px;color:var(--ink-3);margin-bottom:4px">
            Макс. сделок в день: ${limit.maxTradesPerDay}
          </div>
          <input 
            type="range" 
            min="1" 
            max="50" 
            value="${limit.maxTradesPerDay}"
            step="1"
            onchange="window.updateTradesPerDay(this.value)"
            style="width:100%;cursor:pointer"
          />
        </div>
      </div>

      <div style="
        font-size:11px;
        color:var(--ink-3);
        margin-top:12px;
        padding:8px;
        background:var(--surface-2);
        border-radius:6px;
      ">
        💡 Эти лимиты помогают избежать FOMO и больших потерь. Устанавливай консервативно!
      </div>
    </div>
  `;
}

/**
 * Рендерит предупреждение о нарушении лимитов
 */
export function renderLimitViolations(violations) {
  if (violations.length === 0) return '';

  const critical = violations.filter(v => v.severity === 'critical');
  
  return `
    <div style="
      background:linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05));
      border:2px solid rgba(239,68,68,0.4);
      border-radius:12px;
      padding:12px;
      margin:12px 0;
    ">
      <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#EF4444">
        ${critical.length > 0 ? '🚨 КРИТИЧЕСКИЕ НАРУШЕНИЯ!' : '⚠️ ПРЕДУПРЕЖДЕНИЯ'}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${violations.map(v => `
          <div style="
            font-size:11px;
            padding:6px;
            background:var(--surface-2);
            border-radius:6px;
            border-left:3px solid ${v.severity === 'critical' ? '#EF4444' : 
                                    v.severity === 'high' ? '#F59E0B' : '#3B82F6'};
            color:var(--ink-2);
          ">
            <div style="font-weight:600;margin-bottom:2px">${v.message}</div>
            ${v.suggestion ? `<div style="color:var(--ink-3)">${v.suggestion}</div>` : ''}
          </div>
        `).join('')}
      </div>
      ${critical.length > 0 ? `
        <button 
          onclick="alert('Свап заблокирован для твоей защиты.')"
          style="
            width:100%;
            margin-top:10px;
            padding:10px;
            border-radius:8px;
            border:none;
            background:#EF4444;
            color:#fff;
            font-weight:600;
            font-size:12px;
            cursor:not-allowed;
          "
          disabled
        >
          ❌ Свап заблокирован
        </button>
      ` : ''}
    </div>
  `;
}

// Глобальные функции для UI
window.updateDailyLimit = (value) => {
  const limit = getDailyLimit();
  limit.maxDailyLoss = parseFloat(value);
  saveDailyLimit(limit);
  alert(`✓ Дневной лимит потерь: $${value}`);
};

window.updateSingleTrade = (value) => {
  const limit = getDailyLimit();
  limit.maxSingleTrade = parseFloat(value);
  saveDailyLimit(limit);
  alert(`✓ Лимит одной сделки: $${value}`);
};

window.updateTradesPerDay = (value) => {
  const limit = getDailyLimit();
  limit.maxTradesPerDay = parseInt(value);
  saveDailyLimit(limit);
  alert(`✓ Макс. сделок в день: ${value}`);
};
