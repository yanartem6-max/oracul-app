// risk-analyzer.js — AI-анализ рисков токена

/**
 * Рассчитывает риск-скор токена (0-100, где 0 = высокий риск, 100 = безопасно)
 */
export function calculateRiskScore(pair) {
  let score = 50; // базовый скор
  const issues = [];
  const warnings = [];

  // 1. Ликвидность (критично)
  const liquidity = pair.liquidity?.usd || 0;
  if (liquidity < 1000) {
    score -= 30;
    issues.push('Крайне низкая ликвидность (<$1K)');
  } else if (liquidity < 5000) {
    score -= 20;
    issues.push('Очень низкая ликвидность (<$5K)');
  } else if (liquidity < 20000) {
    score -= 10;
    warnings.push('Низкая ликвидность (<$20K)');
  } else if (liquidity > 100000) {
    score += 15;
  } else if (liquidity > 50000) {
    score += 10;
  }

  // 2. Объём торгов
  const volume24h = pair.volume?.h24 || 0;
  const volumeToLiquidity = liquidity > 0 ? volume24h / liquidity : 0;
  
  if (volume24h < 500) {
    score -= 15;
    warnings.push('Очень низкий объём торгов');
  } else if (volumeToLiquidity > 5) {
    score += 10; // хороший оборот
  }

  // 3. Возраст пары (если доступен)
  const pairCreatedAt = pair.pairCreatedAt;
  if (pairCreatedAt) {
    const ageMs = Date.now() - pairCreatedAt;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    if (ageDays < 1) {
      score -= 15;
      warnings.push('Очень новая пара (<1 дня)');
    } else if (ageDays < 7) {
      score -= 5;
    } else if (ageDays > 30) {
      score += 10;
    }
  }

  // 4. Транзакции (buy/sell ratio)
  const buys = pair.txns?.h24?.buys || 0;
  const sells = pair.txns?.h24?.sells || 0;
  const totalTxns = buys + sells;
  
  if (totalTxns < 10) {
    score -= 10;
    warnings.push('Мало транзакций за 24ч');
  } else if (totalTxns > 100) {
    score += 5;
  }

  // Дисбаланс покупок/продаж
  if (totalTxns > 0) {
    const sellRatio = sells / totalTxns;
    if (sellRatio > 0.7) {
      score -= 10;
      warnings.push('Много продаж (возможный дамп)');
    } else if (sellRatio < 0.3) {
      score += 5; // больше покупают
    }
  }

  // 5. Волатильность (изменение цены)
  const change24h = pair.priceChange?.h24 || 0;
  const change1h = pair.priceChange?.h1 || 0;
  
  if (Math.abs(change24h) > 100) {
    score -= 10;
    warnings.push('Экстремальная волатильность');
  }
  
  if (Math.abs(change1h) > 50) {
    score -= 5;
    warnings.push('Сильные колебания цены');
  }

  // 6. FDV / Market Cap проверка
  const fdv = pair.fdv || 0;
  const mc = pair.marketCap || 0;
  if (fdv > 0 && mc > 0 && fdv / mc > 10) {
    score -= 5;
    warnings.push('Большая разница FDV/MC');
  }

  // Ограничиваем скор в диапазоне 0-100
  score = Math.max(0, Math.min(100, score));

  // Определяем уровень риска
  let riskLevel = 'medium';
  let riskLabel = 'Средний риск';
  let riskColor = '#F59E0B'; // orange

  if (score >= 70) {
    riskLevel = 'low';
    riskLabel = 'Низкий риск';
    riskColor = '#22C55E'; // green
  } else if (score >= 50) {
    riskLevel = 'medium';
    riskLabel = 'Средний риск';
    riskColor = '#F59E0B'; // orange
  } else if (score >= 30) {
    riskLevel = 'high';
    riskLabel = 'Высокий риск';
    riskColor = '#EF4444'; // red
  } else {
    riskLevel = 'critical';
    riskLabel = 'Критический риск';
    riskColor = '#DC2626'; // dark red
  }

  return {
    score,
    riskLevel,
    riskLabel,
    riskColor,
    issues,
    warnings,
    metrics: {
      liquidity,
      volume24h,
      volumeToLiquidity,
      buys,
      sells,
      change24h,
      change1h
    }
  };
}

/**
 * Проверка на honeypot/scam (базовая эвристика)
 */
export function checkHoneypot(pair) {
  const risks = [];
  let isHoneypot = false;

  // 1. Нет ликвидности = скам
  const liquidity = pair.liquidity?.usd || 0;
  if (liquidity === 0) {
    isHoneypot = true;
    risks.push('❌ Нулевая ликвидность - возможный скам');
  }

  // 2. Странный ratio покупок к продажам (honeypot признак)
  const buys = pair.txns?.h24?.buys || 0;
  const sells = pair.txns?.h24?.sells || 0;
  
  if (buys > 10 && sells === 0) {
    risks.push('⚠️ Только покупки, нет продаж - подозрение на honeypot');
    isHoneypot = true;
  }

  // 3. Цена падает при объёме (признак дампа)
  const volume = pair.volume?.h24 || 0;
  const change24h = pair.priceChange?.h24 || 0;
  
  if (volume > 10000 && change24h < -80) {
    risks.push('⚠️ Резкое падение при объёме - возможный rug pull');
  }

  // 4. Очень низкая ликвидность для большого FDV
  const fdv = pair.fdv || 0;
  if (fdv > 1000000 && liquidity < 5000) {
    risks.push('⚠️ Огромный FDV при низкой ликвидности - красный флаг');
  }

  return {
    isHoneypot,
    isSuspicious: risks.length > 0,
    risks
  };
}

/**
 * Генерирует AI-объяснение риска для токена
 */
export function generateRiskExplanation(pair, riskData, honeypotData) {
  const { score, riskLevel, issues, warnings } = riskData;
  const { isHoneypot, risks } = honeypotData;

  let explanation = '';

  // Основной вердикт
  if (isHoneypot) {
    explanation = `🚨 ОПАСНО! Этот токен имеет признаки скама или honeypot-контракта. `;
  } else if (score < 30) {
    explanation = `⛔ Критический риск! Не рекомендуется для инвестиций. `;
  } else if (score < 50) {
    explanation = `⚠️ Высокий риск. Инвестируйте только то, что готовы потерять полностью. `;
  } else if (score < 70) {
    explanation = `⚡ Средний риск. Стандартная волатильность для мем-коинов. `;
  } else {
    explanation = `✅ Относительно безопасно по меркам мем-коинов. `;
  }

  // Детали проблем
  if (issues.length > 0) {
    explanation += `\n\n❌ Критические проблемы:\n${issues.map(i => `• ${i}`).join('\n')}`;
  }

  if (warnings.length > 0) {
    explanation += `\n\n⚠️ Предупреждения:\n${warnings.map(w => `• ${w}`).join('\n')}`;
  }

  if (risks.length > 0) {
    explanation += `\n\n🔴 Риски скама:\n${risks.join('\n')}`;
  }

  // Метрики
  const liq = riskData.metrics.liquidity;
  const vol = riskData.metrics.volume24h;
  explanation += `\n\n📊 Ключевые метрики:\n`;
  explanation += `• Ликвидность: $${liq.toLocaleString()}\n`;
  explanation += `• Объём 24ч: $${vol.toLocaleString()}\n`;
  explanation += `• Покупок/Продаж: ${riskData.metrics.buys}/${riskData.metrics.sells}\n`;
  explanation += `• Изменение 24ч: ${riskData.metrics.change24h?.toFixed(2)}%`;

  return explanation;
}

// Глобальная переменная для последнего текущего токена
let lastSelectedPair = null;

/**
 * Рендерит UI для риск-скора в модалке токена
 */
export function renderRiskScore(pair) {
  // Сохраняем для потом использования
  lastSelectedPair = pair;
  
  const riskData = calculateRiskScore(pair);
  const honeypotData = checkHoneypot(pair);
  
  const { score, riskLabel, riskColor } = riskData;
  const { isHoneypot } = honeypotData;

  // Индикатор скора (прогресс-бар)
  const barColor = isHoneypot ? '#DC2626' : riskColor;
  
  return `
    <div class="risk-score-card" style="
      background: linear-gradient(135deg, ${barColor}15, ${barColor}05);
      border: 2px solid ${barColor}40;
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:12px;color:var(--ink-3);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">
            ${isHoneypot ? '🚨 SCAM ALERT' : '🛡️ RISK SCORE'}
          </div>
          <div style="font-size:20px;font-weight:700;color:${barColor};margin-top:4px">
            ${isHoneypot ? 'HONEYPOT' : riskLabel}
          </div>
        </div>
        <div style="
          width:64px;
          height:64px;
          border-radius:50%;
          border:4px solid ${barColor};
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:22px;
          font-weight:700;
          color:${barColor};
          background:${barColor}10;
        ">
          ${isHoneypot ? '⚠️' : score}
        </div>
      </div>
      
      <div class="risk-progress-bar" style="
        width:100%;
        height:8px;
        background:var(--border);
        border-radius:8px;
        overflow:hidden;
        margin-bottom:12px;
      ">
        <div style="
          width:${isHoneypot ? 100 : score}%;
          height:100%;
          background:${barColor};
          border-radius:8px;
          transition:width 0.5s ease;
        "></div>
      </div>

      <button 
        class="risk-details-btn"
        onclick="window.showRiskDetails()"
        style="
          width:100%;
          padding:10px;
          border-radius:8px;
          border:1.5px solid ${barColor};
          background:transparent;
          color:${barColor};
          font-size:13px;
          font-weight:600;
          cursor:pointer;
          transition:all 0.2s;
        "
        onmouseover="this.style.background='${barColor}';this.style.color='#fff'"
        onmouseout="this.style.background='transparent';this.style.color='${barColor}'"
      >
        📋 Подробный анализ рисков
      </button>
    </div>
  `;
}

// Глобальная функция для показа деталей риска
window.showRiskDetails = () => {
  // Используем локально сохранённый pair
  if (!lastSelectedPair) {
    alert('Ошибка: данные токена не загружены. Откройте модалку токена заново.');
    return;
  }

  const pair = lastSelectedPair;
  const riskData = calculateRiskScore(pair);
  const honeypotData = checkHoneypot(pair);
  const explanation = generateRiskExplanation(pair, riskData, honeypotData);

  // Показываем красивый модал
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.style.zIndex = '10000';
  modal.innerHTML = `
    <div class="modal-card" style="max-height:80vh;overflow-y:auto">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="font-size:18px;font-weight:700;margin-bottom:14px">🛡️ Подробный анализ риска</h2>
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
      ">
        ${explanation.replace(/\n/g, '<br/>')}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};
