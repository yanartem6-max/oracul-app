# 🔐 ORACUL Security Best Practices

## ✅ Главное

**Для крипто-приложения безопасность - это ВСЁ!**

### 1️⃣ **Никогда не хранить приватные ключи пользователя**
- ✅ Используйте Phantom (для Solana) - ключи остаются на устройстве
- ✅ Используйте TON Connect - тоже на устройстве
- ❌ Не просите seed фразу или приватный ключ!

### 2️⃣ **Защитить API ключи**
```javascript
// ✅ ПРАВИЛЬНО - в .env, только на сервере
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ❌ НЕПРАВИЛЬНО - видно в исходнике
const GROQ_API_KEY = 'sk_live_abc123';
```

### 3️⃣ **CORS - ограничить доступ**
```javascript
// ❌ БЕЗ ЗАЩИТЫ
res.setHeader('Access-Control-Allow-Origin', '*');

// ✅ С ЗАЩИТОЙ - только свои домены
const allowedOrigins = ['https://oracul.com', 'http://localhost:3000'];
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```

### 4️⃣ **Рейт-лимитинг - защита от DDoS**
```javascript
// Максимум 5 запросов в минуту на /api/chat
if (requestsPerMinute[ip] > 5) {
  return res.status(429).json({ error: 'Too many requests' });
}
```

### 5️⃣ **Валидация всего input**
```javascript
// ✅ ВСЕГДА проверяйте!
if (!inputMint || !outputMint || amount <= 0) {
  return res.status(400).json({ error: 'Invalid parameters' });
}
```

### 6️⃣ **XSS Protection**
```javascript
// ❌ ОПАСНО - user input может быть JS код
element.innerHTML = userInput;

// ✅ БЕЗОПАСНО - только текст
element.textContent = userInput;

// ✅ ЕСЛИ НУЖЕН HTML - санитизируйте
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

### 7️⃣ **Логирование и мониторинг**
```javascript
// Логируйте подозрительную активность
console.warn(`[SECURITY] Rate limit exceeded for IP: ${ip}`);
console.error(`[SECURITY] Invalid swap attempt: ${error}`);
```

### 8️⃣ **HTTPS только (для production)**
```javascript
// Всегда используйте HTTPS для production
res.setHeader('Strict-Transport-Security', 'max-age=31536000');
```

## 🔍 Audit checklist

Перед публикацией проверьте:

- [ ] Нет API ключей в исходном коде
- [ ] CORS ограничен на белый список
- [ ] Рейт-лимитинг включен
- [ ] Все input валидируется
- [ ] HTTPS для production
- [ ] Security headers установлены
- [ ] Dependencies обновлены (`npm audit`)
- [ ] Нет console.log() с sensitive данными
- [ ] Все ошибки логируются
- [ ] Приватные ключи НЕ на сервере

## 🚨 Критичные ошибки

Никогда не делайте:
```javascript
// ❌ Хранить приватные ключи
const pk = user.privateKey;

// ❌ Eval
eval(userInput);

// ❌ Доверять клиентским расчётам
const fee = request.body.fee; // Всегда пересчитайте на сервере!

// ❌ Логировать ключи
console.log('API Key:', apiKey);

// ❌ Hardcode secrets
const SECRET = 'my-secret-key-123';
```

## 📚 Ресурсы

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Snyk - Dependency Security](https://snyk.io/)
- [Helmet.js - Security Headers](https://helmetjs.github.io/)

---

**Помните: безопасность - это постоянный процесс, а не одноразовая работа!** 🔒

