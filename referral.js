// referral.js — реферальная программа

const REFERRAL_KEY = 'oracul_referral';
const REFERRALS_KEY = 'oracul_referrals';

/**
 * Получить или создать реферальный код пользователя
 */
export function getReferralCode() {
  let code = localStorage.getItem(REFERRAL_KEY);
  
  if (!code) {
    // Генерируем уникальный код (8 символов)
    code = generateReferralCode();
    localStorage.setItem(REFERRAL_KEY, code);
  }
  
  return code;
}

/**
 * Генерировать уникальный реферальный код
 */
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Получить список рефералов пользователя
 */
export function getReferrals() {
  try {
    const stored = localStorage.getItem(REFERRALS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('[Referral] Load error:', e);
    return [];
  }
}

/**
 * Добавить реферала
 */
export function addReferral(walletAddress, timestamp = Date.now()) {
  const referrals = getReferrals();
  
  // Проверяем что уже не добавлен
  if (referrals.find(r => r.walletAddress === walletAddress)) {
    return { success: false, message: 'Этот кошелёк уже реферирован' };
  }

  const referral = {
    walletAddress,
    timestamp,
    earnedTokens: 0,
    earnedUSD: 0,
    status: 'active', // active, inactive
  };

  referrals.push(referral);
  localStorage.setItem(REFERRALS_KEY, JSON.stringify(referrals));

  return { success: true, message: 'Реферал добавлен!' };
}

/**
 * Получить статистику рефералов
 */
export function getReferralStats() {
  const referrals = getReferrals();
  
  const totalEarned = referrals.reduce((sum, r) => sum + (r.earnedUSD || 0), 0);
  const activeCount = referrals.filter(r => r.status === 'active').length;
  
  return {
    totalReferrals: referrals.length,
    activeReferrals: activeCount,
    totalEarned,
    referrals,
  };
}

/**
 * Получить URL для приглашения друзей
 */
export function getReferralLink() {
  const code = getReferralCode();
  return `${window.location.origin}?ref=${code}`;
}

/**
 * Обработать реферальный код из URL
 */
export function processReferralCode(refCode) {
  if (!refCode) return null;
  
  // Сохраняем код того кто нас пригласил
  localStorage.setItem('oracul_invited_by', refCode);
  
  return { success: true, message: 'Спасибо что присоединились!' };
}

/**
 * Рендерит страницу Referral Program
 */
export function renderReferralPage() {
  const container = document.getElementById('referralContent');
  if (!container) return;

  const myCode = getReferralCode();
  const myLink = getReferralLink();
  const stats = getReferralStats();

  container.innerHTML = `
    <div style="padding:16px 0">
      <!-- Заголовок -->
      <div style="
        background:linear-gradient(135deg, rgba(255,138,61,0.15), rgba(255,138,61,0.05));
        border:2px solid rgba(255,138,61,0.3);
        border-radius:16px;
        padding:20px;
        margin-bottom:20px;
        text-align:center;
      ">
        <div style="font-size:40px;margin-bottom:12px">🎁</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;color:var(--orange)">Реферальная программа</div>
        <div style="font-size:13px;color:var(--ink-3);line-height:1.6">
          Приглашайте друзей и получайте награды<br/>
          за каждого успешного пользователя
        </div>
      </div>

      <!-- Твой код -->
      <div style="
        background:var(--surface);
        border:2px solid var(--border);
        border-radius:12px;
        padding:16px;
        margin-bottom:16px;
      ">
        <div style="font-size:12px;color:var(--ink-3);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">
          Твой реферальный код
        </div>
        <div style="
          font-family:var(--mono);
          font-size:24px;
          font-weight:700;
          color:var(--orange);
          background:var(--surface-2);
          border-radius:8px;
          padding:14px;
          text-align:center;
          margin-bottom:12px;
          user-select:all;
          cursor:pointer;
        "
        onclick="this.select()"
        >
          ${myCode}
        </div>
        <button 
          onclick="navigator.clipboard.writeText('${myLink}'); alert('🎉 Ссылка скопирована!')"
          style="
            width:100%;
            padding:10px;
            border-radius:8px;
            border:1.5px solid var(--orange);
            background:transparent;
            color:var(--orange);
            font-size:13px;
            font-weight:600;
            cursor:pointer;
            transition:all 0.2s;
          "
          onmouseover="this.style.background='var(--orange)';this.style.color='#fff'"
          onmouseout="this.style.background='transparent';this.style.color='var(--orange)'"
        >
          📋 Копировать ссылку приглашения
        </button>
      </div>

      <!-- Статистика -->
      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin-bottom:16px;
      ">
        <div style="
          background:var(--surface);
          border:1.5px solid var(--border);
          border-radius:12px;
          padding:14px;
          text-align:center;
        ">
          <div style="font-size:11px;color:var(--ink-3);margin-bottom:6px;text-transform:uppercase;font-weight:600">
            Всего рефералов
          </div>
          <div style="font-size:28px;font-weight:700;color:var(--orange)">${stats.totalReferrals}</div>
          <div style="font-size:10px;color:var(--ink-3);margin-top:6px">${stats.activeReferrals} активных</div>
        </div>
        <div style="
          background:var(--surface);
          border:1.5px solid var(--border);
          border-radius:12px;
          padding:14px;
          text-align:center;
        ">
          <div style="font-size:11px;color:var(--ink-3);margin-bottom:6px;text-transform:uppercase;font-weight:600">
            Заработано
          </div>
          <div style="font-size:28px;font-weight:700;color:#22C55E">$${stats.totalEarned.toFixed(2)}</div>
          <div style="font-size:10px;color:var(--ink-3);margin-top:6px">USD эквивалент</div>
        </div>
      </div>

      <!-- Как это работает -->
      <div style="
        background:var(--surface);
        border:1.5px solid var(--border);
        border-radius:12px;
        padding:14px;
        margin-bottom:16px;
      ">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px">❓ Как это работает?</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;gap:10px;align-items:start">
            <div style="
              min-width:28px;
              width:28px;
              height:28px;
              border-radius:50%;
              background:var(--orange);
              color:#fff;
              display:flex;
              align-items:center;
              justify-content:center;
              font-weight:700;
              font-size:12px;
            ">1</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px">Поделись ссылкой</div>
              <div style="font-size:12px;color:var(--ink-3);margin-top:2px">Отправь своё приглашение друзьям</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:start">
            <div style="
              min-width:28px;
              width:28px;
              height:28px;
              border-radius:50%;
              background:var(--orange);
              color:#fff;
              display:flex;
              align-items:center;
              justify-content:center;
              font-weight:700;
              font-size:12px;
            ">2</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px">Друзья присоединяются</div>
              <div style="font-size:12px;color:var(--ink-3);margin-top:2px">Они переходят по твоей ссылке</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:start">
            <div style="
              min-width:28px;
              width:28px;
              height:28px;
              border-radius:50%;
              background:var(--orange);
              color:#fff;
              display:flex;
              align-items:center;
              justify-content:center;
              font-weight:700;
              font-size:12px;
            ">3</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px">Получай награды</div>
              <div style="font-size:12px;color:var(--ink-3);margin-top:2px">
                Бонус в ORACUL токенах за каждого друга
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Структура наград -->
      <div style="
        background:linear-gradient(135deg, rgba(76,175,80,0.1), rgba(76,175,80,0.05));
        border:1.5px solid rgba(76,175,80,0.3);
        border-radius:12px;
        padding:14px;
      ">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px">🏆 Структура наград</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--surface);border-radius:6px">
            <div style="font-size:12px">За каждого реферала</div>
            <div style="font-weight:700;color:#22C55E">+500 ORACUL</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--surface);border-radius:6px">
            <div style="font-size:12px">Бонус при 10 рефералах</div>
            <div style="font-weight:700;color:#FFD700">+5,000 ORACUL</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--surface);border-radius:6px">
            <div style="font-size:12px">Бонус при 50 рефералах</div>
            <div style="font-weight:700;color:#FF6B6B">+50,000 ORACUL</div>
          </div>
        </div>
      </div>

      <!-- Список рефералов -->
      ${stats.referrals.length > 0 ? `
        <div style="margin-top:20px">
          <h3 style="font-size:14px;font-weight:700;margin-bottom:12px">👥 Твои рефералы (${stats.referrals.length})</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${stats.referrals.map((ref, idx) => `
              <div style="
                background:var(--surface);
                border:1.5px solid var(--border);
                border-radius:8px;
                padding:10px;
                display:flex;
                justify-content:space-between;
                align-items:center;
              ">
                <div style="flex:1;min-width:0">
                  <div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    ${ref.walletAddress}
                  </div>
                  <div style="font-size:10px;color:var(--ink-3);margin-top:2px">
                    ${new Date(ref.timestamp).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:12px;font-weight:700;color:#22C55E">+$${(ref.earnedUSD || 0).toFixed(2)}</div>
                  <div style="font-size:10px;color:var(--ink-3);margin-top:2px">
                    ${ref.status === 'active' ? '✓ Активный' : '⊘ Неактивный'}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Обработать реферальный параметр при загрузке
window.addEventListener('load', () => {
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get('ref');
  if (refCode) {
    processReferralCode(refCode);
  }
});
