// sybil-detection.js — обнаружение Sybil-кластеров (связанных кошельков)

/**
 * Анализ для выявления потенциальных Sybil-атак
 * (несколько кошельков один актор)
 */
export async function detectSybilPatterns(pair) {
  const analysis = {
    riskLevel: 'low',
    indicators: [],
    score: 0, // 0-100, где 100 = высокое Sybil-подозрение
  };

  try {
    // 1. Анализ транзакций на паттерны
    const txPatterns = analyzeTransactionPatterns(pair);
    if (txPatterns.suspicious) {
      analysis.indicators.push(txPatterns);
      analysis.score += 20;
    }

    // 2. Анализ ликвидности и объёма
    const liquidityAnalysis = analyzeLiquidityPatterns(pair);
    if (liquidityAnalysis.suspicious) {
      analysis.indicators.push(liquidityAnalysis);
      analysis.score += 15;
    }

    // 3. Анализ вайта-листов/владельцев
    const ownerAnalysis = analyzeOwnershipPattern(pair);
    if (ownerAnalysis.suspicious) {
      analysis.indicators.push(ownerAnalysis);
      analysis.score += 25;
    }

    // 4. Анализ времени транзакций
    const timingAnalysis = analyzeTransactionTiming(pair);
    if (timingAnalysis.suspicious) {
      analysis.indicators.push(timingAnalysis);
      analysis.score += 20;
    }

    // Определяем уровень риска
    if (analysis.score >= 70) {
      analysis.riskLevel = 'critical';
    } else if (analysis.score >= 50) {
      analysis.riskLevel = 'high';
    } else if (analysis.score >= 30) {
      analysis.riskLevel = 'medium';
    } else {
      analysis.riskLevel = 'low';
    }

  } catch (e) {
    console.error('[SybilDetection] Error:', e);
  }

  return analysis;
}

/**
 * Анализ паттернов транзакций
 */
function analyzeTransactionPatterns(pair) {
  const buys = pair.txns?.h24?.buys || 0;
  const sells = pair.txns?.h24?.sells || 0;
  const total = buys + sells;

  const indicators = [];
  let suspicious = false;

  // Если почти одни покупки - потенциальный Sybil pump
  if (total > 0 && buys / total > 0.9) {
    indicators.push('Подозрение: 90%+ покупок (потенциальная синхронизированная атака)');
    suspicious = true;
  }

  // Если ОЧЕНЬ мало транзакций, но большой объём - фейковые
  if (total < 10 && pair.volume?.h24 > 50000) {
    indicators.push('Странно: мало транзакций, но огромный объём (возможны фейк-ботов)');
    suspicious = true;
  }

  return {
    name: 'Transaction Pattern',
    suspicious,
    details: indicators.join('; '),
  };
}

/**
 * Анализ паттернов ликвидности
 */
function analyzeLiquidityPatterns(pair) {
  const liquidity = pair.liquidity?.usd || 0;
  const mc = pair.fdv || pair.marketCap || 0;
  const volume24h = pair.volume?.h24 || 0;

  const indicators = [];
  let suspicious = false;

  // Нулевая ликвидность = скам
  if (liquidity === 0) {
    indicators.push('КРИТИЧНО: Нулевая ликвидность (honeypot?)');
    suspicious = true;
  }

  // Огромное расхождение FDV vs ликвидность
  if (mc > 0 && liquidity / mc < 0.01) {
    indicators.push('Красный флаг: ликвидность <<< FDV (очень опасно)');
    suspicious = true;
  }

  // Объём > ликвидность в многу раз = манипуляция
  if (liquidity > 0 && volume24h / liquidity > 10) {
    indicators.push('Подозрение: объём в 10+ раз превышает ликвидность (манипуляция)');
    suspicious = true;
  }

  return {
    name: 'Liquidity Pattern',
    suspicious,
    details: indicators.join('; '),
  };
}

/**
 * Анализ владельцев/создателей
 */
function analyzeOwnershipPattern(pair) {
  const indicators = [];
  let suspicious = false;

  // Если есть информация о создателе
  if (!pair.baseToken?.address) {
    indicators.push('Подозрение: нет информации об адресе токена (неполные данные)');
    suspicious = true;
  }

  // Если пара очень новая и уже много активности - может быть координированная
  if (pair.pairCreatedAt) {
    const ageHours = (Date.now() - pair.pairCreatedAt) / 3600000;
    if (ageHours < 1 && pair.volume?.h24 > 100000) {
      indicators.push('Новая пара с ОГРОМНЫМ объёмом за часы (координированная атака?)');
      suspicious = true;
    }
  }

  return {
    name: 'Ownership Pattern',
    suspicious,
    details: indicators.join('; '),
  };
}

/**
 * Анализ времени транзакций (координированность)
 */
function analyzeTransactionTiming(pair) {
  const indicators = [];
  let suspicious = false;

  // Если есть резкие скачки объёма - может быть координированное действие
  if (pair.volume?.h24 && pair.volume?.h6 && pair.volume?.h1) {
    const ratio24to6 = pair.volume.h24 / (pair.volume.h6 * 4);
    
    if (ratio24to6 > 3) {
      indicators.push('Подозрение: 80% объёма за последний час (возможный coord pump)');
      suspicious = true;
    }
  }

  // Если цена меняется рывками (не плавно) - может быть манипуляция
  if (pair.priceChange?.h1 && pair.priceChange?.h24) {
    const volatility1h = Math.abs(pair.priceChange.h1);
    if (volatility1h > 50) {
      indicators.push('Экстремальная волатильность за 1 час (вероятна манипуляция)');
      suspicious = true;
    }
  }

  return {
    name: 'Transaction Timing',
    suspicious,
    details: indicators.join('; '),
  };
}

/**
 * Рендерит UI для Sybil анализа
 */
export async function renderSybilAnalysis(pair) {
  const analysis = await detectSybilPatterns(pair);

  const riskColors = {
    low: { color: '#22C55E', label: 'Низкое подозрение' },
    medium: { color: '#F59E0B', label: 'Среднее подозрение' },
    high: { color: '#FF6B6B', label: 'Высокое подозрение' },
    critical: { color: '#DC2626', label: 'КРИТИЧЕСКОЕ!' },
  };

  const riskInfo = riskColors[analysis.riskLevel];

  return `
    <div class="sybil-analysis" style="
      background:linear-gradient(135deg, ${riskInfo.color}15, ${riskInfo.color}05);
      border:2px solid ${riskInfo.color}40;
      border-radius:12px;
      padding:14px;
      margin:12px 0;
    ">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
        <div>
          <div style="font-size:12px;color:var(--ink-3);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">
            🕵️ Sybil Detection
          </div>
          <div style="font-size:14px;font-weight:700;color:${riskInfo.color};margin-top:4px">
            ${riskInfo.label}
          </div>
        </div>
        <div style="
          width:56px;
          height:56px;
          border-radius:50%;
          border:3px solid ${riskInfo.color};
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:24px;
          font-weight:700;
          color:${riskInfo.color};
          background:${riskInfo.color}10;
        ">
          ${analysis.score}
        </div>
      </div>

      <!-- Прогресс бар -->
      <div style="
        width:100%;
        height:6px;
        background:var(--border);
        border-radius:6px;
        overflow:hidden;
        margin-bottom:12px;
      ">
        <div style="
          width:${analysis.score}%;
          height:100%;
          background:${riskInfo.color};
          transition:width 0.5s ease;
        "></div>
      </div>

      <!-- Индикаторы -->
      ${analysis.indicators.length > 0 ? `
        <div style="
          background:var(--surface-2);
          border-radius:8px;
          padding:10px;
          margin-bottom:12px;
        ">
          <div style="font-size:11px;color:var(--ink-3);font-weight:600;margin-bottom:8px">
            🚩 Обнаруженные признаки:
          </div>
          <ul style="margin:0;padding-left:16px;font-size:11px;line-height:1.6;color:var(--ink-2)">
            ${analysis.indicators.map(ind => `
              <li>${ind.details || ind.name}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Рекомендация -->
      <div style="
        background:var(--surface);
        border-left:3px solid ${riskInfo.color};
        border-radius:6px;
        padding:8px;
        font-size:11px;
        color:var(--ink-2);
        line-height:1.5;
      ">
        ${getSybilRecommendation(analysis.riskLevel)}
      </div>
    </div>
  `;
}

/**
 * Получить рекомендацию на основе уровня риска
 */
function getSybilRecommendation(riskLevel) {
  const recommendations = {
    low: '✅ Нет явных признаков Sybil-атаки. Но проверь другие индикаторы риска.',
    medium: '⚠️ Есть некоторые подозрения. Будь осторожен перед входом.',
    high: '🚨 Высокое подозрение на координированную манипуляцию. Рекомендуем избегать.',
    critical: '❌ КРИТИЧНО! Это похоже на Sybil-атаку. НЕ ВХОДИТЬ!',
  };
  return recommendations[riskLevel] || 'Неизвестный уровень риска';
}

/**
 * Рендерит страницу Sybil Detection для Settings
 */
export function renderSybilDetectionInfo() {
  return `
    <div style="
      background:var(--surface);
      border:1.5px solid var(--border);
      border-radius:12px;
      padding:14px;
      margin:12px 0;
    ">
      <div style="font-size:14px;font-weight:700;margin-bottom:10px">🕵️ Что такое Sybil?</div>
      <div style="font-size:12px;line-height:1.8;color:var(--ink-2)">
        <p>Sybil-атака - когда один актор контролирует много кошельков чтобы:</p>
        <ul style="margin:0;padding-left:20px">
          <li>💰 Накупить токены по дешёвке</li>
          <li>📈 Создать иллюзию интереса (много покупок)</li>
          <li>🔥 Запустить PUMP через координированные действия</li>
          <li>💣 Затем DUMP - продать всем сразу на пике</li>
        </ul>
        <p>ORACUL обнаруживает такие паттерны автоматически.</p>
      </div>
    </div>

    <div style="
      background:linear-gradient(135deg, rgba(76,175,80,0.1), rgba(76,175,80,0.05));
      border:1.5px solid rgba(76,175,80,0.3);
      border-radius:12px;
      padding:14px;
      margin:12px 0;
    ">
      <div style="font-size:14px;font-weight:700;margin-bottom:10px">🛡️ Как защищаться?</div>
      <div style="font-size:12px;line-height:1.8;color:var(--ink-2)">
        <p>✓ Проверяй Sybil скор перед входом</p>
        <p>✓ Избегай токенов с рывками объёма (100% за 1 час)</p>
        <p>✓ Смотри на ликвидность vs FDV соотношение</p>
        <p>✓ Если объём > ликвидность в 10 раз - это red flag</p>
        <p>✓ Входи на отскоке, не на вершине pump-а</p>
      </div>
    </div>
  `;
}
