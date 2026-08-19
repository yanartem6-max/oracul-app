// ===== ORACUL — главный модуль =====
import { initCatalog, renderCoinModal, initChart } from './catalog.js?v=15';
import { initWalletUI } from './wallet.js?v=16';
import { initSwap } from './swap.js?v=16';
import { initProfile } from './profile.js?v=15';
import { initSettings, renderSettings, applyTranslations, t, onSettingsChange } from './settings.js?v=16';
import { renderWatchlistPage } from './watchlist.js';
import { renderPortfolioPage } from './portfolio.js';
import { renderSmartWalletsCard } from './smart-wallets.js';
import { renderReferralPage } from './referral.js';
import { renderSmartWalletsCard as renderWallets } from './smart-wallets.js';
import { renderSybilAnalysis } from './sybil-detection.js';

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
  const wait = Math.max(0, 1400 - (Date.now() - startedAt));
  setTimeout(() => {
    loadingEl.classList.add('is-leaving');
    setTimeout(() => {
      loadingEl.style.display = 'none';
      mainEl.classList.add('is-visible');
    }, 500);
  }, wait);
}
window.addEventListener('load', revealApp);
if (document.readyState === 'complete') revealApp();

// ─── Навигация ────────────────────────────────────────────────────────────────
const navBtns = document.querySelectorAll('.nav-btn');
const pages   = document.querySelectorAll('.page');

function showPage(pageId) {
  pages.forEach(p => p.classList.remove('active'));
  navBtns.forEach(b => b.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
  document.querySelector(`.nav-btn[data-page="${pageId}"]`)?.classList.add('active');
  if (pageId === 'pageSettings') renderSettings();
  if (pageId === 'pageWatchlist') renderWatchlistPage();
  if (pageId === 'pagePortfolio') renderPortfolioPage();
  if (pageId === 'pageReferral') renderReferralPage();
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
  setTimeout(() => initChart(pair), 350);

  // Загружаем Smart Wallets анализ асинхронно
  setTimeout(async () => {
    const container = coinModalContent.querySelector('#smartWalletsContainer');
    if (container) {
      const walletsHtml = await renderSmartWalletsCard(pair);
      container.innerHTML = walletsHtml;
      container.style.display = 'block';
    }

    // Загружаем Sybil анализ
    const sybilContainer = coinModalContent.querySelector('#sybilDetectionContainer');
    if (sybilContainer) {
      const sybilHtml = await renderSybilAnalysis(pair);
      sybilContainer.innerHTML = sybilHtml;
      sybilContainer.style.display = 'block';
    }
  }, 500);

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
