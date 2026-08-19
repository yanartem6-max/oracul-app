# ORACUL — Telegram Mini App

> Безопасное криптовалютное приложение для анализа мем-коинов и торговли на Solana/TON

Бело-оранжевый мини-апп с загрузочным экраном в стиле стекла (glassmorphism)
и ИИ-чатом «Оракул» на базе Groq API.

## 🔐 Безопасность

✅ **Private keys НИКОГДА не попадают на сервер** - все подписи происходят в Phantom/TON Connect
✅ **API ключи защищены** - хранятся только в переменных окружения сервера  
✅ **CORS whitelist** - только запросы с web.telegram.org разрешены
✅ **Rate limiting** - защита от DDoS и спама (50 req/min, 20 msg/hr)
✅ **Input validation** - все данные проверяются перед обработкой

**Документация безопасности**: см. [SECURITY.md](./SECURITY.md)
**Аудит уязвимостей**: см. [VULNERABILITIES_FIXED.md](./VULNERABILITIES_FIXED.md)
**Инструкция деплоя**: см. [DEPLOYMENT.md](./DEPLOYMENT.md)

## Что внутри

```
oracul/
├── index.html           — разметка (экран загрузки + UI)
├── app.js               — основная логика приложения
├── wallet.js            — подключение Phantom/TON кошельков (безопасное)
├── swap.js              — интеграция с Jupiter для свопов
├── catalog.js           — каталог монет
├── settings.js          — система переводов i18n (4 языка)
├── style.css            — дизайн с стекломорфизмом
├── server.js            — backend с защитой (CORS, rate limit)
├── package.json
├── .env.example         — шаблон переменных окружения
├── SECURITY.md          —详細なセキュリティガイド
├── VULNERABILITIES_FIXED.md — аудит + исправления
└── DEPLOYMENT.md        — как задеплоить на Vercel

```

Ключ Groq **никогда** не должен попадать в браузер — все запросы
идут через `server.js`, а фронтенд стучится только в `/api/chat`.

## 1. Запуск локально

```bash
npm install
cp .env.example .env
# вписать свой ключ в .env: GROQ_API_KEY=...
npm start
```

Сервер поднимется на `http://localhost:3000`.

## 2. Получить ключ Groq

1. Зайти на https://console.groq.com/keys
2. Создать API-ключ, вставить в `.env` как `GROQ_API_KEY`
3. ⚠️ **ВАЖНО**: Никогда не коммитить `.env` файл! Он уже в `.gitignore`

## 3. Зарегистрировать мини-апп в Telegram

1. Открыть **@BotFather** → создать бота (`/newbot`), если его ещё нет
2. `/newapp` → выбрать своего бота → указать название **ORACUL**, картинку, описание
3. В качестве **Web App URL** указать публичный HTTPS-адрес

## 4. Задеплоить на Vercel (Рекомендуемо)

**Самый безопасный способ**:

1. Push code на GitHub
2. Откройте https://vercel.com/new → Import GitHub repo
3. Установите переменные окружения:
   - `GROQ_API_KEY` (from console.groq.com)
   - `FEE_ACCOUNT` (ваш Solana кошелек)
   - `ALLOWED_ORIGINS_CUSTOM` (ваше доменное имя)
4. Deploy!

**Подробнее**: см. [DEPLOYMENT.md](./DEPLOYMENT.md)

Для локального тестирования с доступом с другим устройством:

```bash
npm install -g ngrok
ngrok http 3000
```

и указать выданный `https://xxxx.ngrok-free.app` как Web App URL в BotFather.

## 🌍 Интернационализация

Приложение поддерживает **4 языка** (переключаются в Настройках):
- 🇷🇺 Русский
- 🇬🇧 English  
- 🇨🇳 中文 (Chinese)
- 🇪🇸 Español (Spanish)

Все текста динамически переводятся при смене языка.

## 🛡️ Безопасность в разработке

### Правила кодирования:

- ✅ Используйте `t()` для всех текстов (система переводов)
- ✅ Никогда не логируйте API ключи или приватные ключи
- ✅ Все чувствительные операции только на backend
- ✅ Используйте `fetch()` с HTTPS в продакшене
- ❌ Не используйте `eval()` или динамический код
- ❌ Не коммитьте `.env` файл

### Перед деплоем:

```bash
# Проверьте что .env не в git
git ls-files .env  # не должно ничего вывести

# Проверьте что .env в gitignore
cat .gitignore | grep .env

# Удалите .env из истории если он туда попал
git rm --cached .env
git commit -m "remove .env from tracking"
```

## 🔍 Мониторинг

После деплоя:

- 📊 Проверяйте использование Groq API еженедельно
- 🛡️ Ищите `[SECURITY]` логи для блокированных запросов
- 🔄 Ротируйте API ключи ежемесячно
- ⚠️ Следите за rate limit ошибками (HTTP 429)

## Дизайн

- Палитра: тёплый белый фон + оранжевый акцент (`#FF6B1A` / `#FF8A3D`)
- Заголовки — Cormorant Garamond, интерфейс — Inter, моношрифт — JetBrains Mono
- Загрузочный экран: стеклянный «орб» с пульсацией и вращающимися орбитами
- Сообщения: стеклянные пузыри у Оракула, оранжевый градиент у пользователя

## 📚 Дополнительные ресурсы

- [SECURITY.md](./SECURITY.md) — детальное руководство по безопасности
- [VULNERABILITIES_FIXED.md](./VULNERABILITIES_FIXED.md) — полный аудит безопасности
- [DEPLOYMENT.md](./DEPLOYMENT.md) — пошаговое руководство по деплою на Vercel
- [.env.example](./.env.example) — шаблон переменных окружения

## 📝 Лицензия

Open source. Используйте на свой риск.

---

**Версия**: 1.0  
**Последнее обновление**: Август 2026  
**Статус**: ✅ Production Ready
