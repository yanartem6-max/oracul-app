// ===== ORACUL — главный модуль =====
import { initCatalog, renderCoinModal, initChart } from './catalog.js?v=18';
import { initWalletUI } from './wallet.js?v=100';
import { initSwap } from './swap.js?v=16';
import { initProfile } from './profile.js?v=15';
import { initSettings, renderSettings, applyTranslations, t, onSettingsChange, fmtPrice } from './settings.js?v=16';

// Делаем fmtPrice доступной глобально для HTML шаблонов
window.fmtPrice = fmtPrice;

// ─── Telegram WebApp ──────────────────────────────────────────────────────────
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#FFFFFF'); tg.setBackgroundColor('#F7F7F7'); } catch {}
}

// ─── Настройки ────────────────────────────────────────────────────────────────
initSettings();

// ─── Загрузочный экран ────────────────────────────────────────────────────────
const loadingEl = document.getElementById('loading');
const mainEl    = document.getElementById('main');
const startedAt = Date.now();

function revealApp() {
  const wait = Math.max(0, 800 - (Date.now() - startedAt)); // Уменьшили с 1400 до 800ms
  setTimeout(() => {
    loadingEl.classList.add('is-leaving');
    setTimeout(() => {
      loadingEl.style.display = 'none';
      mainEl.classList.add('is-visible');
    }, 500);
  }, wait);
}

// Триггеры для показа app
window.addEventListener('load', revealApp);
if (document.readyState === 'complete') revealApp();

// Fallback: если ничего не произошло за 3 сек - форсируем показ
setTimeout(() => {
  if (loadingEl && loadingEl.style.display !== 'none') {
    revealApp();
  }
}, 3000);

// ─── Навигация ────────────────────────────────────────────────────────────────
const navBtns = document.querySelectorAll('.nav-btn');
const pages   = document.querySelectorAll('.page');

function showPage(pageId) {
  pages.forEach(p => p.classList.remove('active'));
  navBtns.forEach(b => b.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
  document.querySelector(`.nav-btn[data-page="${pageId}"]`)?.classList.add('active');
  
  if (pageId === 'pageSettings') renderSettings();
  
  if (pageId === 'pageWatchlist') {
    import('./watchlist.js?v=17').then(m => m.renderWatchlistPage());
  }
  if (pageId === 'pagePortfolio') {
    import('./portfolio.js').then(m => m.renderPortfolioPage());
  }
  if (pageId === 'pageReferral') {
    import('./referral.js').then(m => m.renderReferralPage());
  }
}

navBtns.forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));

// ─── Модальные окна для Условий и Политики ────────────────────────────────────
function showTermsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal-card" style="max-height:80vh;overflow-y:auto">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="font-size:20px;font-weight:700;margin-bottom:16px;color:var(--orange)" data-i18n="terms">Условия</h2>
      <div style="font-size:14px;line-height:1.6;color:var(--ink-2)">
        <h3 style="font-weight:700;margin:16px 0 8px" data-i18n="terms_h1">Условия использования ORACUL</h3>
        <p data-i18n="terms_p1">1. ORACUL - это инструмент для анализа крипто-активов на блокчейне Solana.</p>
        <p data-i18n="terms_p2">2. Приватные ключи пользователей никогда не передаются на сервер.</p>
        <p data-i18n="terms_p3">3. Пользователь несет полную ответственность за свои решения о покупке/продаже токенов.</p>
        <p data-i18n="terms_p4">4. ORACUL предоставляет информацию в образовательных целях.</p>
        <p style="margin-top:16px;font-weight:600" data-i18n="terms_p5">5. Все данные получены из публичных APIs блокчейна.</p>
        <p data-i18n="terms_p6">6. Использование сервиса означает согласие с этими условиями.</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  applyTranslations(); // Применяем переводы к новому контенту
}

function showPrivacyModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal-card" style="max-height:80vh;overflow-y:auto">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="font-size:20px;font-weight:700;margin-bottom:16px;color:var(--orange)" data-i18n="privacy_policy">Политика конфиденциальности</h2>
      <div style="font-size:14px;line-height:1.6;color:var(--ink-2)">
        <h3 style="font-weight:700;margin:16px 0 8px" data-i18n="privacy_h1">Как мы защищаем ваши данные</h3>
        <p data-i18n="privacy_p1">1. ORACUL не хранит приватные ключи пользователей.</p>
        <p data-i18n="privacy_p2">2. Все данные кошельков получаются напрямую из блокчейна через публичные APIs.</p>
        <p data-i18n="privacy_p3">3. Мы не отслеживаем и не сохраняем личную информацию.</p>
        <p data-i18n="privacy_p4">4. Соединение защищено HTTPS шифрованием.</p>
        <p style="margin-top:16px;font-weight:600" data-i18n="privacy_p5">5. Никакие персональные данные не передаются третьим лицам.</p>
        <p data-i18n="privacy_p6">6. Вся обработка данных происходит локально в браузере.</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  applyTranslations(); // Применяем переводы к новому контенту
}

// Делаем функции глобальными для использования из onclick
window.showTermsModal = showTermsModal;
window.showPrivacyModal = showPrivacyModal;

// ─── Модалка монеты ───────────────────────────────────────────────────────────
const coinModal        = document.getElementById('coinModal');
const coinModalClose   = document.getElementById('coinModalClose');
const coinModalContent = document.getElementById('coinModalContent');

function openCoinModal(pair) {
  coinModalContent.innerHTML = renderCoinModal(pair);
  coinModal.classList.add('open');
  setTimeout(() => {
    initChart(pair);
    
    // Добавляем обработчик для полноэкранной кнопки
    const fullscreenBtn = document.getElementById('fullscreenChartBtn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        console.log('[Fullscreen] Opening fullscreen chart');
        openFullscreenChart(pair);
      });
    }
  }, 350);

  // Загружаем анализы асинхронно
  setTimeout(async () => {
    try {
      // Risk Score
      const { renderRiskScore } = await import('./risk-analyzer.js');
      const riskHtml = renderRiskScore(pair);
      
      // AI Buttons
      const { renderAIAdvisorButtons, getTokenAnalysis, getFOMOWarning } = await import('./ai-advisor.js?v=18');
      const aiHtml = renderAIAdvisorButtons(pair);
      
      // Watchlist Button
      const { renderWatchlistButton } = await import('./watchlist.js?v=17');
      const watchlistHtml = renderWatchlistButton(pair);
      
      const analysisContainer = coinModalContent.querySelector('#analysisContainer');
      if (analysisContainer) {
        analysisContainer.innerHTML = riskHtml + aiHtml;
        
        // Добавляем event listeners для AI кнопок
        const aiBtn = analysisContainer.querySelector('#aiAnalysisBtn');
        const fomoBtn = analysisContainer.querySelector('#fomoCheckBtn');
        
        if (aiBtn) {
          aiBtn.addEventListener('click', async () => {
            console.log('[AI Click] Button clicked');
            const originalText = aiBtn.textContent;
            aiBtn.disabled = true;
            aiBtn.textContent = '⏳ Анализ...';
            
            try {
              const result = await getTokenAnalysis(pair);
              console.log('[AI] Result:', result);
              
              if (result.success) {
                showAIModal('🤖 AI Анализ токена', result.analysis);
              } else {
                alert('Ошибка: ' + (result.error || 'неизвестная ошибка'));
              }
            } catch (e) {
              console.error('[AI] Error:', e);
              alert('Ошибка при получении анализа: ' + e.message);
            }
            
            aiBtn.disabled = false;
            aiBtn.textContent = originalText;
          });
        }
        
        if (fomoBtn) {
          fomoBtn.addEventListener('click', async () => {
            console.log('[FOMO Click] Button clicked');
            const originalText = fomoBtn.textContent;
            fomoBtn.disabled = true;
            fomoBtn.textContent = '⏳ Проверка...';
            
            try {
              const portfolio = {}; // Пустой портфель
              const advice = await getFOMOWarning(pair, portfolio);
              console.log('[FOMO] Advice:', advice);
              showAIModal('⚠️ FOMO Проверка', advice);
            } catch (e) {
              console.error('[FOMO] Error:', e);
              alert('Ошибка при проверке FOMO: ' + e.message);
            }
            
            fomoBtn.disabled = false;
            fomoBtn.textContent = originalText;
          });
        }
      }
      
      const watchlistContainer = coinModalContent.querySelector('#watchlistBtnContainer');
      if (watchlistContainer) {
        watchlistContainer.innerHTML = watchlistHtml;
      }

      // Smart Wallets (если контейнер есть)
      const smartContainer = coinModalContent.querySelector('#smartWalletsContainer');
      if (smartContainer) {
        const { renderSmartWalletsCard } = await import('./smart-wallets.js');
        const walletsHtml = await renderSmartWalletsCard(pair);
        smartContainer.innerHTML = walletsHtml;
        smartContainer.style.display = 'block';
      }

      // Функция для показа AI модала
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

      // Sybil Detection
      const sybilContainer = coinModalContent.querySelector('#sybilDetectionContainer');
      if (sybilContainer) {
        const { renderSybilAnalysis } = await import('./sybil-detection.js');
        const sybilHtml = await renderSybilAnalysis(pair);
        sybilContainer.innerHTML = sybilHtml;
        sybilContainer.style.display = 'block';
      }
    } catch (e) {
      console.error('[Modal] Error loading analysis:', e);
    }
  }, 600);

  coinModalContent.querySelector('#modalBuyBtn')?.addEventListener('click', () => {
    closeCoinModal();
    showPage('pageSwap');
    const mint = pair.baseToken?.address;
    if (mint) {
      import('./swap.js?v=4').then(({ POPULAR_MEME }) => {
        if (!POPULAR_MEME.find(tk => tk.mint === mint)) {
          POPULAR_MEME.push({
            symbol: pair.baseToken?.symbol || '?',
            name:   pair.baseToken?.name   || '?',
            mint,   logoUrl: pair.info?.imageUrl || '',
          });
        }
        document.getElementById('pickTokenOut').textContent = (pair.baseToken?.symbol || '?') + ' ▾';
      });
    }
  });
}

function closeCoinModal() { coinModal.classList.remove('open'); }
coinModalClose.addEventListener('click', closeCoinModal);
coinModal.addEventListener('click', e => { if (e.target === coinModal) closeCoinModal(); });

// ─── ИИ чат ───────────────────────────────────────────────────────────────────
const messagesEl = document.getElementById('messages');
const composerEl = document.getElementById('composer');
const inputEl    = document.getElementById('input');
const history    = [];

// Форматирование markdown-подобного текста от ИИ
function formatAIMessage(text) {
  return text
    // **жирный**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // *курсив*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // `код`
    .replace(/`(.+?)`/g, '<code style="background:var(--surface-2);padding:1px 5px;border-radius:4px;font-family:var(--mono);font-size:12px">$1</code>')
    // ### Заголовок
    .replace(/^###\s(.+)$/gm, '<div style="font-weight:700;font-size:15px;margin:6px 0 2px">$1</div>')
    // ## Заголовок
    .replace(/^##\s(.+)$/gm, '<div style="font-weight:700;font-size:16px;margin:8px 0 3px;color:var(--orange)">$1</div>')
    // - список
    .replace(/^[-•]\s(.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:var(--orange);flex-shrink:0">▸</span><span>$1</span></div>')
    // строки с % изменением
    .replace(/(\+[\d.]+%)/g, '<span style="color:var(--green);font-weight:600">$1</span>')
    .replace(/(−[\d.]+%|-[\d.]+%)/g, '<span style="color:var(--red);font-weight:600">$1</span>')
    // Условия - кликабельная ссылка на вкладку
    .replace(/Условия/g, '<a onclick="showPage(\'pageTerms\')" style="cursor:pointer;color:var(--orange);text-decoration:underline;font-weight:600">Условия</a>')
    // Terms - clickable link
    .replace(/Terms/g, '<a onclick="showPage(\'pageTerms\')" style="cursor:pointer;color:var(--orange);text-decoration:underline;font-weight:600">Terms</a>')
    // Политика конфиденциальности - кликабельная ссылка
    .replace(/Политика конфиденциальности/g, '<a onclick="showPage(\'pagePrivacy\')" style="cursor:pointer;color:var(--orange);text-decoration:underline;font-weight:600">Политика конфиденциальности</a>')
    // Privacy Policy - clickable link
    .replace(/Privacy Policy/g, '<a onclick="showPage(\'pagePrivacy\')" style="cursor:pointer;color:var(--orange);text-decoration:underline;font-weight:600">Privacy Policy</a>')
    // переносы строк
    .replace(/\n/g, '<br>');
}

function addMessage(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  if (role === 'ai') {
    el.innerHTML = formatAIMessage(text);
  } else {
    el.textContent = text;
  }
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function addTyping() {
  const el = document.createElement('div');
  el.className = 'msg ai typing';
  el.innerHTML = '<span></span><span></span><span></span>';
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

async function sendMessage(text) {
  addMessage('user', text);
  history.push({ role: 'user', content: text });
  const typingEl = addTyping();
  try {
    const res  = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok) throw new Error('status ' + res.status);
    const data  = await res.json();
    const reply = data.reply || 'Оракул молчит…';
    typingEl.remove();
    addMessage('ai', reply);
    history.push({ role: 'assistant', content: reply });
  } catch (err) {
    typingEl.remove();
    addMessage('ai', t('ai_connection_error'));
  }
}

composerEl.addEventListener('submit', e => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = ''; inputEl.style.height = 'auto';
  sendMessage(text);
});
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); composerEl.requestSubmit(); }
});
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
});

// ─── Инициализация ────────────────────────────────────────────────────────────
initWalletUI();
initCatalog(openCoinModal);
initSwap();
initProfile();

// ─── Реакция на смену языка / валюты / темы ───────────────────────────────────
onSettingsChange((key) => {
  // Перезагружаем каталог при смене валюты или языка
  if (key === 'currency' || key === 'lang') {
    const activeTab = document.querySelector('.tab-btn.active');
    const tabName = activeTab?.dataset?.tab || 'trending';
    const listEl  = document.getElementById('coinsList');
    if (listEl) {
      import('./catalog.js?v=15').then(({ reloadCatalog }) => {
        reloadCatalog?.(tabName, openCoinModal);
      });
    }
  }
  // При смене языка обновляем пустые поля свапа
  if (key === 'lang') {
    const swapBtn = document.getElementById('swapBtn');
    if (swapBtn && swapBtn.textContent === t('swap_quote_btn') || !swapBtn?.dataset?.quoted) {
      // кнопка ещё не нажата — обновляем надпись
    }
  }
});

setTimeout(() => {
  if (!messagesEl.children.length) {
    addMessage('ai', `🎯 **ORACUL**\n\n${t('ai_greeting_help') || 'Я помогу тебе:'}\n- 📊 ${t('ai_help1') || 'Анализировать мем-коины и токены'}\n- ⚠️ ${t('ai_help2') || 'Оценивать риски перед покупкой'}\n- 🔮 ${t('ai_help3') || 'Разбираться в DeFi и Solana'}\n- 💡 ${t('ai_help4') || 'Находить интересные возможности'}\n\n${t('ai_greeting_end') || 'Спроси меня про любую монету или стратегию 🚀'}\n\n${t('ai_disclaimer') || '⚠️ ИИ может ошибаться. Всегда перепроверяй информацию самостоятельно!'}`);
  }
}, 1800);

// При смене языка обновляем приветствие если чат пустой
onSettingsChange((key) => {
  if (key === 'lang' && messagesEl.children.length <= 1) {
    messagesEl.innerHTML = '';
    addMessage('ai', `🎯 **ORACUL**\n\n${t('ai_greeting_help') || 'I can help you:'}\n- 📊 ${t('ai_help1') || 'Analyze meme coins and tokens'}\n- ⚠️ ${t('ai_help2') || 'Assess risks before buying'}\n- 🔮 ${t('ai_help3') || 'Understand DeFi and Solana'}\n- 💡 ${t('ai_help4') || 'Find interesting opportunities'}\n\n${t('ai_greeting_end') || 'Ask me about any coin or strategy 🚀'}\n\n${t('ai_disclaimer') || '⚠️ AI can make mistakes. Always double-check information!'}`);
  }
});


// ─── Полноэкранный график ──────────────────────────────────────────────────────
async function openFullscreenChart(pair) {
  if (!pair) {
    alert('Токен не загружен');
    return;
  }

  console.log('[Fullscreen] Creating fullscreen chart for:', pair.baseToken?.symbol);

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
      max-width: 1200px;
      height: 90vh;
      background: var(--surface);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
    ">
      <!-- Закрыть -->
      <button 
        class="fullscreen-close-btn"
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
            ${(pair.chainId || '').toUpperCase()} • ${pair.pairAddress?.slice(-8).toUpperCase()}
          </p>
        </div>
        <div style="text-align: right">
          <div style="font-size: 18px; font-weight: 700; font-family: var(--mono)">${window.fmtPrice?.(pair.priceUsd) || '—'}</div>
        </div>
      </div>

      <!-- Вкладки разрешений -->
      <div style="
        display: flex;
        gap: 4px;
        padding: 8px 16px;
        border-bottom: 1px solid var(--border);
        overflow-x: auto;
      " class="fullscreen-chart-tabs">
        <button class="chart-tab-btn" data-res="60">1H</button>
        <button class="chart-tab-btn" data-res="240">4H</button>
        <button class="chart-tab-btn active" data-res="1440">1D</button>
        <button class="chart-tab-btn" data-res="0">ALL</button>
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

  // Обработчик закрытия
  const closeBtn = modal.querySelector('.fullscreen-close-btn');
  closeBtn.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Загружаем график
  setTimeout(async () => {
    try {
      const container = document.getElementById('fullscreenChartContainer');
      if (container) {
        console.log('[Fullscreen] Loading chart into container');
        await initChart(pair, container, true, 1440);
        
        // Добавляем обработчики для кнопок разрешения
        const tabBtns = modal.querySelectorAll('.chart-tab-btn[data-res]');
        tabBtns.forEach(btn => {
          btn.addEventListener('click', async () => {
            const resolution = parseInt(btn.dataset.res) || 1440;
            console.log('[Fullscreen] Switching to resolution:', resolution);
            
            // Обновляем активную кнопку
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Перезагружаем график
            container.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--ink-3)">⏳</div>';
            await initChart(pair, container, true, resolution);
          });
        });
      }
    } catch (e) {
      console.error('[Fullscreen] Error loading chart:', e);
      const container = document.getElementById('fullscreenChartContainer');
      if (container) {
        container.innerHTML = '<div style="color:var(--red);padding:20px;text-align:center">Ошибка загрузки графика</div>';
      }
    }
  }, 100);
}
