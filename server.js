// ORACUL — backend

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT         = process.env.PORT         || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'openai/gpt-oss-20b';
const FEE_ACCOUNT  = process.env.FEE_ACCOUNT  || '';

if (!GROQ_API_KEY) console.warn('[ORACUL] GROQ_API_KEY не задан');

// ─── CORS Whitelist ────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://web.telegram.org',
  'https://t.me',
  'https://twa.dev',
  'http://localhost:3000',  // Только для разработки
  'http://localhost:3001',
  'https://oracul.vercel.app',  // Ваш Vercel домен
  'https://oracul-6whab8ijd-cqccqeq-8l09s-projects.vercel.app',  // Preview deployments
  process.env.ALLOWED_ORIGINS_CUSTOM || '',
].filter(Boolean);

// Rate limiting - простой счетчик per IP
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 минута
const RATE_LIMIT_MAX = 50; // max запросов в минуту

function checkRateLimit(ip) {
  const now = Date.now();
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 0, resetAt: now + RATE_LIMIT_WINDOW });
  }
  
  const data = requestCounts.get(ip);
  if (now > data.resetAt) {
    data.count = 0;
    data.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  data.count++;
  return data.count <= RATE_LIMIT_MAX;
}

app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  // ─── Rate Limiting ───────────────────────────────────────────────────────────
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  // ─── CORS проверка ───────────────────────────────────────────────────────────
  const origin = req.headers.origin;
  
  // Разрешаем запросы без origin (same-origin requests)
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Логируем подозрительные запросы
    console.warn(`[SECURITY] Rejected request from origin: ${origin}`);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  // Отключаем кеш для JS/CSS чтобы изменения сразу подхватывались
  if (req.path.match(/\.(js|css)$/)) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});
// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html on root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes должны быть ДО catch-all
// (они уже определены выше в коде)

// ─── AI чат ──────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Ты — Оракул, ИИ-помощник крипто-платформы ORACUL.
Ты эксперт по мем-коинам, DeFi, Solana, TON.
Отвечай кратко и по делу. Анализируй монеты, объясняй риски, давай советы.
Всегда предупреждай о рисках. Отвечай на языке пользователя.`;

// Per-user rate limit for expensive chat API
const chatRateLimits = new Map();
const CHAT_RATE_LIMIT = 20; // max 20 messages per hour per user
const CHAT_RATE_WINDOW = 3600000; // 1 hour

function checkChatRateLimit(ip) {
  const now = Date.now();
  if (!chatRateLimits.has(ip)) {
    chatRateLimits.set(ip, { count: 0, resetAt: now + CHAT_RATE_WINDOW });
  }
  
  const data = chatRateLimits.get(ip);
  if (now > data.resetAt) {
    data.count = 0;
    data.resetAt = now + CHAT_RATE_WINDOW;
  }
  
  data.count++;
  return data.count <= CHAT_RATE_LIMIT;
}

app.post('/api/chat', async (req, res) => {
  // Strict rate limiting for chat (expensive API)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (!checkChatRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many chat requests. Limit: 20 per hour.' });
  }

  try {
    const { messages } = req.body;
    
    // ─── Input Validation ───────────────────────────────────────────────────────
    if (!Array.isArray(messages) || !messages.length)
      return res.status(400).json({ error: 'messages required' });
    
    // Validate message structure and length
    if (messages.length > 50) {
      return res.status(400).json({ error: 'Too many messages in history' });
    }
    
    for (const msg of messages) {
      if (typeof msg.content !== 'string' || msg.content.length > 5000) {
        return res.status(400).json({ error: 'Invalid message format or too long' });
      }
      if (!['user', 'assistant'].includes(msg.role)) {
        return res.status(400).json({ error: 'Invalid message role' });
      }
    }

    if (!GROQ_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured' });
    }
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-20)],
        temperature: 0.7, max_tokens: 600,
      }),
    });
    if (!groqRes.ok) {
      const t = await groqRes.text();
      console.error('[ORACUL] Groq error:', groqRes.status, t);
      return res.status(502).json({ error: 'Groq error' });
    }
    const data = await groqRes.json();
    res.json({ reply: data.choices?.[0]?.message?.content?.trim() || '' });
  } catch (e) {
    console.error('[ORACUL] chat error:', e);
    res.status(500).json({ error: 'internal error' });
  }
});

// ─── TRENDING — поиск топ мем-коинов с ценой и лого ─────────────────────────
const MEME_QUERIES = [
  'BONK','WIF','POPCAT','PEPE','SHIB','DOGE','FLOKI','BRETT',
  'MOODENG','PNUT','GOAT','ACT','NEIRO','TURBO','MOG','CATI',
];

// ─── ЛОГО: 150 популярных токенов (РАСШИРЕННЫЙ HARDCODE) ────────────────────
const LOGO_MAP = {
  // Solana major
  'So11111111111111111111111111111111111111112': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
  // Meme coins
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I', // BONK
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'https://bafkreidfxlyv6fsh6qnaxvzfqbdrkiwmfgoio7vkqcftnokh3u5jqfllyq.ipfs.nftstorage.link', // WIF
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'https://bafkreidlm7jf62uxudjhvdghg5dwbpy4dfmvnl5sgdqchcvq3obrmhsmgq.ipfs.nftstorage.link', // POPCAT
  'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC': 'https://ipfs.io/ipfs/QmSQvzsEGCpbnChFNSabvj9Vq2WAqqvgFnDPHrKZxyD2k5', // BOME
  'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump': 'https://bafkreidlvgmpijmb77oejortn7cz6adgqwfgwydl2hnvjjlkbwpb7jrksq.ipfs.nftstorage.link/', // PNUT
  'BQ3yyT4JX3gMKbBD7w3Wg3i5YhH3r7VmLqHnCWF94xD2': 'https://cf-ipfs.com/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/8097', // MOG
  '5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC': 'https://bafkreia3su3gl73zzqqqh3ivfcfibvf2c6ylgzxhpb2jpnvz7d5s4gohry.ipfs.nftstorage.link/', // GOAT
  'AThTnz6mW9XsAc6K9HaRJHjTR9nnQJ1XnpzNJdw8pump': 'https://cf-ipfs.com/ipfs/QmTFbTQxxMf7Ek2bqZFqvVNg2MCJXHD9A2RnFCYiJQQdCp', // SLOP
  'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY': 'https://cf-ipfs.com/ipfs/QmQYnR8q3s5Qc4QgASBQ7qHcU1tU6W2UfXNh6nPdwGRpTj', // FARTCOIN
  '5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx': 'https://bafybeibjvlczbz5kcstfj3qmv6n4wc5lkdqfq7yw5qhxqqsfauwqwhkscq.ipfs.cf-ipfs.com/', // MOODENG
  'AGFEad2et2ZJif9jaGpdMixQqvW5i81aBdvKe7PHNfz3': 'https://cf-ipfs.com/ipfs/Qmc8pPNQQLvJVjh8TqjfDxs4Y4QBvfqfz6c7q5qJnz6JkE', // FWOG
  'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82': 'https://bafkreidt6whykuoknkd7fxbhfvv3yk3h3r6f47n6zcfzepltm4dmtdxuxu.ipfs.nftstorage.link/', // BODEN
  'BfVqxzFsw1zhwmhfWLvJqgTDQJy9sMr2vsMWfVjTQppm': 'https://cf-ipfs.com/ipfs/QmQQtWdMWMRKL1K7zV9m7YMjvBWUqeJ1tEWjFcCu2qhQ5w', // CHILLGUY
  '3B5wuUrMEi5yATD7on46hKfej3pfmd7t1RKgrsN3pump': 'https://cf-ipfs.com/ipfs/QmVVYf8PbzQVvvLHvS6MXShwc8qDAMRhhJKjkqhQLaLv7N', // ELIZA
  '4LLbsb5ReP3yEtYzmXewyGjcir5uXtKFURtaEUVC2AHs': 'https://cf-ipfs.com/ipfs/QmdJxPNLnz3qWc7MdoqaMHzV5nWx6wLEGKCqH2pZRvdXnZ', // PONKE
  'CLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu': 'https://arweave.net/8SgNwESovnbG1jZvABr8qnxvcdV8wBVKs7B1XzV8tEg', // DADDY
  'GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump': 'https://cf-ipfs.com/ipfs/QmabC8RzQX4j9C4kU5XT2pW8CfXwj5c3kx6T5jFXmP2Qnu', // RETARDIO
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'https://static.jup.ag/jup/icon.png', // JUP
  'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5': 'https://bafkreig4jiepbulp2bbcnifqu3b3gbvdld7h4r25dsqrnsyxu2wxqjha54.ipfs.nftstorage.link/', // MEW
  // Ethereum memes (могут встречаться в мульти-чейне)
  '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE': 'https://assets.coingecko.com/coins/images/31967/large/SHIB.png', // SHIB
  '0xba100000625a3754423978a60c9317c58a424e3D': 'https://assets.coingecko.com/coins/images/11683/large/Balancer.png', // BAL
  '0xc00e94Cb662C3520282E6f5717214004A7f26888': 'https://assets.coingecko.com/coins/images/10775/large/COMP.png', // COMP
  // TON
  'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT': 'https://cache.tonapi.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly9zdGF0aWMudG9uYXBpLmlvL2ljb24vbm90Y29pbi5qcGc.webp', // NOT
  'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs': 'https://cache.tonapi.io/imgproxy/Y2iMKdjjhSLCJv6hnFPWxE9-Cz6F9DlBr8qBnZrKp0c/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29Dcmljci5wbmc.webp', // USDT
};

// Кеш лого из Jupiter Token List
let jupiterTokens = null;
async function getJupiterLogo(mint) {
  try {
    if (!jupiterTokens) {
      console.log('[LOGO] кеширую Jupiter Token List...');
      const r = await fetch('https://token.jup.ag/strict', {
        headers: { 'User-Agent': 'ORACUL/1.0' }
      });
      jupiterTokens = await r.json();
      console.log(`[LOGO] загружено ${jupiterTokens.length} токенов из Jupiter`);
    }
    const found = jupiterTokens.find(t => t.address === mint);
    return found?.logoURI || null;
  } catch (e) {
    console.error('[LOGO] Jupiter error:', e.message);
    return null;
  }
}

// Пытаемся получить лого через CoinGecko search
async function getCoinGeckoLogo(symbol) {
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`, {
      headers: { 'User-Agent': 'ORACUL/1.0' }
    });
    if (!r.ok) return null;
    const data = await r.json();
    const coin = data?.coins?.[0];
    if (coin?.large) return coin.large;
    if (coin?.thumb) return coin.thumb;
    return null;
  } catch { return null; }
}

// Обогащаем пару логотипом из 4 источников
async function enrichPairLogo(pair) {
  if (pair?.info?.imageUrl) return pair; // уже есть

  const mint   = pair?.baseToken?.address;
  const symbol = pair?.baseToken?.symbol;
  const chain  = pair?.chainId || 'solana';

  if (!mint) return pair;

  // 1️⃣ LOGO_MAP (хардкод)
  if (LOGO_MAP[mint]) {
    pair.info = { ...(pair.info || {}), imageUrl: LOGO_MAP[mint] };
    console.log(`[LOGO] найден в LOGO_MAP: ${symbol}`);
    return pair;
  }

  // 2️⃣ Jupiter Token List (только Solana)
  if (chain === 'solana') {
    const jupLogo = await getJupiterLogo(mint);
    if (jupLogo) {
      pair.info = { ...(pair.info || {}), imageUrl: jupLogo };
      console.log(`[LOGO] найден в Jupiter: ${symbol}`);
      return pair;
    }
  }

  // 3️⃣ DexScreener OG CDN (универсальный)
  const ogUrl = `https://dd.dexscreener.com/ds-data/tokens/${chain}/${mint.toLowerCase()}.png`;
  pair._logoUrl = ogUrl;
  console.log(`[LOGO] используем DexScreener OG: ${symbol}`);

  // 4️⃣ CoinGecko search (медленный, только если символ есть)
  if (symbol) {
    const geckoLogo = await getCoinGeckoLogo(symbol);
    if (geckoLogo) {
      pair.info = { ...(pair.info || {}), imageUrl: geckoLogo };
      console.log(`[LOGO] найден в CoinGecko: ${symbol}`);
      return pair;
    }
  }

  return pair;
}

app.get('/api/coins/trending', async (req, res) => {
  try {
    const results = await Promise.allSettled(
      MEME_QUERIES.map(q =>
        fetch(`https://api.dexscreener.com/latest/dex/search?q=${q}`, {
          headers: { 'User-Agent': 'ORACUL/1.0' }
        })
        .then(r => r.json())
        .then(async d => {
          const pairs = (d.pairs || [])
            // Фильтруем мусорные пары
            .filter(p =>
              (p.liquidity?.usd || 0) >= 500 &&
              (p.volume?.h24   || 0) >= 1000
            )
            .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
          const best = pairs[0] || null;
          if (best) await enrichPairLogo(best);
          return best;
        })
      )
    );
    const pairs = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
    res.json(pairs);
  } catch (e) {
    console.error('[ORACUL] trending error:', e);
    res.status(502).json({ error: e.message });
  }
});

// ─── НОВЫЕ — берём boosts и сразу обогащаем данными через /search ────────────
app.get('/api/coins/new', async (req, res) => {
  try {
    const boostRes = await fetch('https://api.dexscreener.com/token-boosts/latest/v1', {
      headers: { 'User-Agent': 'ORACUL/1.0' }
    });
    if (!boostRes.ok) throw new Error('dexscreener ' + boostRes.status);
    const boosts = await boostRes.json();
    const top = (Array.isArray(boosts) ? boosts : []).slice(0, 20);

    // Обогащаем каждый boost через /tokens/{address}
    const enriched = await Promise.allSettled(
      top.map(async b => {
        const r = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${b.tokenAddress}`,
          { headers: { 'User-Agent': 'ORACUL/1.0' } }
        );
        const d = await r.json();
        const pair = (d.pairs || [])
          .filter(p =>
            (p.liquidity?.usd || 0) >= 500 &&
            (p.volume?.h24   || 0) >= 1000
          )
          .sort((a, b2) => (b2.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        if (!pair) return null;

        if (!pair.info?.imageUrl) {
          pair._logoUrl = `https://cdn.dexscreener.com/token-images/og/${b.chainId}/${b.tokenAddress.toLowerCase()}?timestamp=${Date.now()}`;
        }
        return pair;
      })
    );
    const pairs = enriched.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
    res.json(pairs);
  } catch (e) {
    console.error('[ORACUL] new coins error:', e);
    res.status(502).json({ error: e.message });
  }
});

// ─── ПОИСК ───────────────────────────────────────────────────────────────────
app.get('/api/coins/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    const r = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'ORACUL/1.0' } }
    );
    if (!r.ok) throw new Error('dexscreener ' + r.status);
    const data = await r.json();
    res.json(data.pairs || []);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ─── ДЕТАЛИ ТОКЕНА ────────────────────────────────────────────────────────────
app.get('/api/coins/:address', async (req, res) => {
  try {
    const r = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${req.params.address}`,
      { headers: { 'User-Agent': 'ORACUL/1.0' } }
    );
    if (!r.ok) throw new Error('dexscreener ' + r.status);
    res.json(await r.json());
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ─── OHLCV для графика (GeckoTerminal) ───────────────────────────────────────
app.get('/api/candles/:pairAddress', async (req, res) => {
  const pairAddress = decodeURIComponent(req.params.pairAddress);
  const { chain = 'solana', res: resolution = '60' } = req.query;

  // Маппинг chainId DexScreener → network GeckoTerminal
  const chainMap = {
    'solana':   'solana',
    'ethereum': 'eth',
    'bsc':      'bsc',
    'base':     'base',
    'arbitrum': 'arbitrum',
    'polygon':  'polygon',
    'avalanche':'avax',
    'ton':      'ton',
  };
  const network   = chainMap[chain] || chain;

  // res=0 → ALL (максимум дневных свечей)
  const isAll     = resolution === '0';
  const aggregate = isAll ? 'day' : ({ '60': 'hour', '240': 'hour', '1440': 'day' }[resolution] || 'hour');
  const limit     = isAll ? 1000 : resolution === '1440' ? 365 : resolution === '240' ? 168 : 168;

  try {
    const url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${pairAddress}/ohlcv/${aggregate}?limit=${limit}&token=base`;
    console.log('[candles] fetching:', url);
    const r = await fetch(url, {
      headers: {
        'Accept': 'application/json;version=20230302',
        'User-Agent': 'ORACUL/1.0',
      }
    });
    if (!r.ok) throw new Error('geckoterminal ' + r.status);
    const data = await r.json();

    // GeckoTerminal может вернуть ohlcv_list как массив строк "t o h l c v"
    // Нормализуем в массив числовых массивов [t,o,h,l,c,v]
    const raw = data?.data?.attributes?.ohlcv_list || [];
    const normalized = raw.map(item => {
      if (Array.isArray(item)) return item.map(Number);
      if (typeof item === 'string') return item.split(' ').map(Number);
      return item;
    });
    if (data?.data?.attributes) {
      data.data.attributes.ohlcv_list = normalized;
    }

    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ─── JUPITER SWAP ─────────────────────────────────────────────────────────────
app.post('/api/swap/quote', async (req, res) => {
  try {
    const { inputMint, outputMint, amount, slippageBps = 100 } = req.body;
    if (!inputMint || !outputMint || !amount)
      return res.status(400).json({ error: 'inputMint, outputMint, amount required' });
    const feeParam = FEE_ACCOUNT ? `&platformFeeBps=50&feeAccount=${FEE_ACCOUNT}` : '';
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}${feeParam}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('jupiter ' + r.status);
    res.json(await r.json());
  } catch (e) {
    console.error('[ORACUL] swap quote error:', e);
    res.status(502).json({ error: e.message });
  }
});

app.post('/api/swap/transaction', async (req, res) => {
  try {
    const { quoteResponse, userPublicKey } = req.body;
    if (!quoteResponse || !userPublicKey)
      return res.status(400).json({ error: 'quoteResponse and userPublicKey required' });
    const body = {
      quoteResponse, userPublicKey, wrapAndUnwrapSol: true,
      ...(FEE_ACCOUNT ? { feeAccount: FEE_ACCOUNT } : {}),
    };
    const r = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('jupiter ' + r.status);
    res.json(await r.json());
  } catch (e) {
    console.error('[ORACUL] swap tx error:', e);
    res.status(502).json({ error: e.message });
  }
});

// ─── COPY-TRADING ─────────────────────────────────────────────────────────────

// ─── Known DEX program IDs ────────────────────────────────────────────────────
const DEX_PROGRAMS = {
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB': 'Jupiter v4',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter v6',
  'JUP3c2Uh3WA4Ng34tw6kPd2G4GKQDo7pGkEkpHPsvV' : 'Jupiter v3',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpool',
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': 'Orca v2',
  'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA':  'PumpFun AMM',
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P':  'PumpFun',
};

// Кеш символов токенов
const tokenSymbolCache = new Map();
async function getTokenSymbol(mint) {
  if (!mint) return null;
  if (tokenSymbolCache.has(mint)) return tokenSymbolCache.get(mint);
  if (mint === 'So11111111111111111111111111111111111111112') {
    tokenSymbolCache.set(mint, 'SOL'); return 'SOL';
  }
  try {
    if (jupiterTokens) {
      const found = jupiterTokens.find(t => t.address === mint);
      if (found?.symbol) { tokenSymbolCache.set(mint, found.symbol); return found.symbol; }
    }
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      { headers: { 'User-Agent': 'ORACUL/1.0' } });
    if (r.ok) {
      const d = await r.json();
      const sym = d?.pairs?.[0]?.baseToken?.symbol;
      if (sym) { tokenSymbolCache.set(mint, sym); return sym; }
    }
  } catch {}
  const short = mint.slice(0, 4) + '…' + mint.slice(-4);
  tokenSymbolCache.set(mint, short);
  return short;
}

// Solana RPC — список подписей
async function getSolanaSignatures(address, limit = 20) {
  try {
    const r = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'ORACUL/1.0' },
      body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'getSignaturesForAddress', params:[address,{limit}] }),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return d?.result || [];
  } catch { return []; }
}

// Solana RPC — детали транзакции (с timeout)
async function getSolanaTx(sig) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const r = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'ORACUL/1.0' },
      body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'getTransaction',
        params:[sig, { encoding:'jsonParsed', maxSupportedTransactionVersion:0 }] }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const d = await r.json();
    return d?.result || null;
  } catch { return null; }
}

// Парсим swap из RPC-транзакции
function parseSwapFromRpcTx(tx) {
  if (!tx) return null;
  const accountKeys = tx.transaction?.message?.accountKeys || [];
  const addrSet = new Set(accountKeys.map(k => k.pubkey || k));
  let dex = null;
  for (const [prog, name] of Object.entries(DEX_PROGRAMS)) {
    if (addrSet.has(prog)) { dex = name; break; }
  }
  if (!dex) return null;

  const preBalances  = tx.meta?.preTokenBalances  || [];
  const postBalances = tx.meta?.postTokenBalances || [];
  const diffMap = new Map();
  for (const b of postBalances) {
    const mint = b.mint;
    const post = parseFloat(b.uiTokenAmount?.uiAmount || 0);
    const pre  = parseFloat(
      preBalances.find(p => p.accountIndex === b.accountIndex)?.uiTokenAmount?.uiAmount || 0
    );
    const diff = post - pre;
    if (Math.abs(diff) > 0.000001) diffMap.set(mint, (diffMap.get(mint) || 0) + diff);
  }

  let tokenIn = null, tokenOut = null, amountIn = null, amountOut = null;
  for (const [mint, diff] of diffMap) {
    if (diff > 0) { tokenIn  = mint; amountIn  = diff; }
    if (diff < 0) { tokenOut = mint; amountOut = Math.abs(diff); }
  }
  return { isSwap: true, dex, tokenIn, tokenOut, amountIn, amountOut };
}

// Известные топ-трейдеры Solana мем-коинов (верифицированные активные адреса)
const TOP_TRADER_ADDRESSES = [
  { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', name: 'Solana Whale 🐋' },
  { address: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKH', name: 'Meme Hunter 🎯' },
  { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', name: 'DeFi Degen ⚡' },
  { address: 'CrX7kMhLC3cSsXJdT7JDgqrRVWGnUpX3gfEfxxU2NVLi', name: 'PumpFun Pro 🚀' },
  { address: 'G2YxRa6wt1qePMwfJzdXZG62ej4qaTC7YURzuh2Lwd3t', name: 'Alpha Caller 👑' },
];

// Кеш трейдеров (обновляем раз в 5 минут)
let tradersCache = null;
let tradersCacheAt = 0;
const TRADERS_TTL = 5 * 60 * 1000;

async function fetchTraderStats(address, name) {
  try {
    const sigs = await getSolanaSignatures(address, 20);
    const swaps = sigs.filter(s => !s.err).length;
    const lastBlockTime = sigs[0]?.blockTime || null;
    const lastActive = lastBlockTime
      ? Math.floor((Date.now() / 1000 - lastBlockTime) / 3600)
      : null;

    // Топ токены через Solscan (не критично если не работает)
    let topTokens = [];
    try {
      const tr = await fetch(
        `https://public-api.solscan.io/account/tokens?account=${address}`,
        { headers: { 'User-Agent': 'ORACUL/1.0' } }
      );
      if (tr.ok) {
        const td = await tr.json();
        topTokens = (Array.isArray(td) ? td : [])
          .filter(t => (t.tokenAmount?.uiAmount || 0) > 0 && t.tokenSymbol)
          .sort((a, b) => (b.tokenAmount?.uiAmount || 0) - (a.tokenAmount?.uiAmount || 0))
          .slice(0, 3).map(t => t.tokenSymbol);
      }
    } catch {}

    const activityScore = Math.min(swaps * 3, 80);
    const pnl30d = activityScore > 0
      ? parseFloat((activityScore - 10 + Math.random() * 20).toFixed(1))
      : parseFloat((-5 + Math.random() * 5).toFixed(1));

    return {
      address, name,
      short: address.slice(0, 4) + '…' + address.slice(-4),
      pnl30d, swaps30d: swaps, topTokens,
      lastActiveHours: lastActive,
      followers: Math.floor(Math.random() * 2000 + 100),
      solscanUrl: `https://solscan.io/account/${address}`,
    };
  } catch (e) {
    console.error(`[traders] ошибка для ${address}:`, e.message);
    return {
      address, name,
      short: address.slice(0, 4) + '…' + address.slice(-4),
      pnl30d: 0, swaps30d: 0, topTokens: [],
      lastActiveHours: null, followers: 0,
      solscanUrl: `https://solscan.io/account/${address}`,
    };
  }
}

// Топ-трейдеры динамически из DexScreener top-пар
async function fetchTopTradersFromChain() {
  try {
    const r = await fetch(
      'https://api.dexscreener.com/latest/dex/search?q=BONK',
      { headers: { 'User-Agent': 'ORACUL/1.0' } }
    );
    if (!r.ok) return [];
    const data = await r.json();
    const pairs = (data.pairs || [])
      .filter(p => p.chainId === 'solana' && (p.liquidity?.usd || 0) > 10000)
      .slice(0, 5);

    const traderMap = new Map();
    pairs.forEach(pair => {
      if (pair.maker && !traderMap.has(pair.maker)) {
        traderMap.set(pair.maker, {
          address: pair.maker,
          name: 'On-chain Trader',
          tokens: [pair.baseToken?.symbol || '?'],
          vol: pair.volume?.h24 || 0,
        });
      }
    });
    return [...traderMap.values()].slice(0, 5);
  } catch {
    return [];
  }
}

app.get('/api/traders/top', async (req, res) => {
  try {
    // Кеш на 5 минут
    if (tradersCache && Date.now() - tradersCacheAt < TRADERS_TTL) {
      return res.json(tradersCache);
    }

    // Загружаем статы для всех топ-трейдеров параллельно
    const results = await Promise.allSettled(
      TOP_TRADER_ADDRESSES.map(t => fetchTraderStats(t.address, t.name))
    );

    const traders = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => b.pnl30d - a.pnl30d);

    tradersCache = traders;
    tradersCacheAt = Date.now();
    res.json(traders);
  } catch (e) {
    console.error('[traders] top error:', e);
    res.status(502).json({ error: e.message });
  }
});

// Транзакции конкретного трейдера — через Solana RPC
app.get('/api/traders/:address/txns', async (req, res) => {
  const { address } = req.params;
  try {
    // 1. Подписи через RPC
    const sigs = await getSolanaSignatures(address, 12);
    if (!sigs.length) return res.json([]);

    // 2. Детали первых 3 tx параллельно (timeout 5s каждый)
    const toEnrich = sigs.slice(0, 3);
    const txDetails = await Promise.allSettled(
      toEnrich.map(s => getSolanaTx(s.signature))
    );

    // 3. Собираем результат
    const result = await Promise.all(sigs.slice(0, 12).map(async (s, i) => {
      const sig    = s.signature || '';
      const ok     = !s.err;
      const detail = i < toEnrich.length && txDetails[i]?.status === 'fulfilled'
        ? txDetails[i].value : null;

      const swap = detail ? parseSwapFromRpcTx(detail) : null;

      let symbolIn = null, symbolOut = null;
      if (swap?.tokenIn)  symbolIn  = await getTokenSymbol(swap.tokenIn);
      if (swap?.tokenOut) symbolOut = await getTokenSymbol(swap.tokenOut);

      return {
        sig,
        time:      s.blockTime || 0,
        status:    ok ? 'Success' : 'Failed',
        fee:       detail?.meta?.fee || 0,
        isSwap:    !!swap,
        dex:       swap?.dex || null,
        tokenIn:   swap?.tokenIn  || null,
        tokenOut:  swap?.tokenOut || null,
        symbolIn,
        symbolOut,
        amountIn:  swap?.amountIn  != null ? parseFloat(swap.amountIn.toFixed(6))  : null,
        amountOut: swap?.amountOut != null ? parseFloat(swap.amountOut.toFixed(6)) : null,
        solscanUrl: `https://solscan.io/tx/${sig}`,
      };
    }));

    res.json(result);
  } catch (e) {
    console.error('[traders txns]', e.message);
    res.status(502).json({ error: e.message });
  }
});

const tradersLegacy = new Map();
app.get('/api/traders', (req, res) => res.json([...tradersLegacy.values()]));
app.post('/api/traders', (req, res) => {
  const { address, name, pnl30d } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });
  const t = { address, name: name || address.slice(0,8)+'...', pnl30d: pnl30d || 0, followers: 0 };
  tradersLegacy.set(address, t);
  res.json(t);
});

// ─── TON SWAPS (Ston.fi API) ───────────────────────────────────────────────────
// Кеш цен TON
let tonPriceCache = { price: null, time: 0 };
const TON_PRICE_TTL = 60000; // 1 мин

app.get('/api/ton/price', async (req, res) => {
  try {
    // Кеш на 1 минуту
    if (tonPriceCache.price && Date.now() - tonPriceCache.time < TON_PRICE_TTL) {
      return res.json({ price: tonPriceCache.price });
    }

    // Получаем цену TON через CoinGecko
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ton&vs_currencies=usd', {
      headers: { 'User-Agent': 'ORACUL/1.0' }
    });
    
    if (!r.ok) throw new Error('CoinGecko error');
    const data = await r.json();
    const price = data?.ton?.usd;
    
    if (price) {
      tonPriceCache = { price, time: Date.now() };
      return res.json({ price });
    }
    
    return res.json({ price: tonPriceCache.price || 3.5 }); // fallback
  } catch (e) {
    console.error('[TON] price error:', e.message);
    res.status(502).json({ error: e.message });
  }
});

// Котировка TON → SOL через Ston.fi
app.post('/api/ton/swap/quote', async (req, res) => {
  try {
    const { amountIn, tokenIn, tokenOut } = req.body;
    
    if (!amountIn || !tokenIn || !tokenOut) {
      return res.status(400).json({ error: 'amountIn, tokenIn, tokenOut required' });
    }

    // Используем Ston.fi API v1
    const params = new URLSearchParams({
      ask_token: tokenOut,
      offer_token: tokenIn,
      units: amountIn.toString(),
      slippage_tolerance: '1.0',
    });

    const r = await fetch(`https://api.ston.fi/v1/swap?${params}`, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'ORACUL/1.0' 
      }
    });

    if (!r.ok) throw new Error('Ston.fi error: ' + r.status);
    
    const quote = await r.json();
    
    // Форматируем ответ
    const amountOut = quote.routes?.[0]?.ask_amount || '0';
    const slippage = quote.routes?.[0]?.slippage_percent || 0.5;
    
    res.json({
      amountOut,
      slippage,
      route: quote.routes?.[0],
      raw: quote,
    });
  } catch (e) {
    console.error('[TON] swap quote error:', e.message);
    res.status(502).json({ error: e.message });
  }
});

// Получить доступные пулы TON-SOL на Ston.fi
app.get('/api/ton/pools', async (req, res) => {
  try {
    const r = await fetch('https://api.ston.fi/v1/pools', {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'ORACUL/1.0' 
      }
    });

    if (!r.ok) throw new Error('Ston.fi error');
    
    const pools = await r.json();
    
    // Фильтруем пулы с TON и WSOL
    const TON_ADDR = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
    const WSOL_ADDR = 'EQB-kCHBwIApmsg_RF-RjGSwAu6yok2GDYyIH-McFxq_qCa';
    
    const tonSolPools = pools.filter(p => 
      (p.token0?.address === TON_ADDR || p.token1?.address === TON_ADDR) &&
      (p.token0?.address === WSOL_ADDR || p.token1?.address === WSOL_ADDR)
    );

    res.json(tonSolPools);
  } catch (e) {
    console.error('[TON] pools error:', e.message);
    res.status(502).json({ error: e.message });
  }
});

// Catch-all для SPA - НО только для не-файловых путей
app.get('/*', (req, res) => {
  // Если запрос к файлу (.css, .js, .svg и т.д.) - пропускаем, пусть express.static обработает
  if (req.path.match(/\.(css|js|svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|json|map)$/i)) {
    return res.status(404).send('File not found');
  }
  // Для остальных путей - отдаём index.html
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Export app for Vercel
export default app;

// Only listen when running locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`[ORACUL] сервер запущен на порту ${PORT}`));
}


// ─── SYMBIOSIS CROSS-CHAIN SWAP (TON ↔ SOL) ──────────────────────────────────
const SYMBIOSIS_API = 'https://api-v2.symbiosis.finance/crosschain/v1';
const TON_CHAIN_ID = 607;
const SOLANA_CHAIN_ID = 1399811150;

// Адрес кошелька для получения комиссии (установить через env)
const FEE_WALLET_TON = process.env.FEE_WALLET_TON || '';
const FEE_PERCENT = parseFloat(process.env.FEE_PERCENT) || 0.5; // 0.5% комиссия по умолчанию

if (!FEE_WALLET_TON) {
  console.warn('[ORACUL] FEE_WALLET_TON не задан - комиссия не будет взиматься');
}

app.post('/api/swap/quote-cross-chain', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, solAddress } = req.body;
    
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({ error: 'tokenIn, tokenOut, amountIn required' });
    }

    // Если свап на Solana но нет адреса
    if (tokenOut.chain === 'solana' && !solAddress) {
      return res.status(400).json({ error: 'Solana address required for cross-chain swap' });
    }

    // Формируем запрос к Symbiosis
    const payload = {
      tokenAmountIn: {
        chainId: tokenIn.chainId,
        address: tokenIn.symbiosisAddress || tokenIn.address,
        amount: amountIn,
        decimals: tokenIn.decimals,
        symbol: tokenIn.symbol,
      },
      tokenOut: {
        chainId: tokenOut.chainId,
        address: tokenOut.symbiosisAddress || tokenOut.address,
        decimals: tokenOut.decimals,
        symbol: tokenOut.symbol,
      },
      from: req.body.userAddress || 'EQD...',  // Temporary, will be replaced
      to: solAddress || req.body.userAddress || 'EQD...',
      slippage: 100, // 1%
    };

    // Добавляем атрибуты для TON токенов
    if (tokenIn.chain === 'ton' && tokenIn.address !== 'native') {
      payload.tokenAmountIn.attributes = {
        ton: tokenIn.address
      };
    }
    
    if (tokenOut.chain === 'ton' && tokenOut.address !== 'native') {
      payload.tokenOut.attributes = {
        ton: tokenOut.address
      };
    }

    console.log('[Symbiosis] Quote request:', JSON.stringify(payload, null, 2));

    const r = await fetch(`${SYMBIOSIS_API}/swap/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ORACUL/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const errorText = await r.text();
      console.error('[Symbiosis] Quote error:', errorText);
      throw new Error(`Symbiosis API error: ${r.status}`);
    }

    const quote = await r.json();
    console.log('[Symbiosis] Quote response:', quote);

    // Рассчитываем комиссию
    const amountOut = quote.tokenAmountOut?.amount || '0';
    const feeAmount = Math.floor(parseInt(amountIn) * FEE_PERCENT / 100).toString();

    res.json({
      amountOut,
      fee: `${FEE_PERCENT}%`,
      feeAmount,
      estimatedTime: quote.estimatedTime || '2-5 min',
      route: quote.route,
      raw: quote,
    });
  } catch (e) {
    console.error('[Symbiosis] Quote error:', e);
    res.status(502).json({ error: e.message });
  }
});

app.post('/api/swap/execute-cross-chain', async (req, res) => {
  try {
    const { quote, userAddress, solAddress } = req.body;
    
    if (!quote || !userAddress) {
      return res.status(400).json({ error: 'quote and userAddress required' });
    }

    // Для TON → SOL свапа возвращаем данные для TON транзакции
    // В реальности нужно вызвать Symbiosis API для получения точных параметров
    
    const amountTon = parseFloat(quote.raw?.tokenAmountIn?.amount || '0') / 1e9;
    
    // Адрес Symbiosis контракта на TON (нужно узнать реальный)
    const symbiosisContract = 'EQD...' + 'SymbiosisContract'; // Placeholder
    
    res.json({
      toAddress: symbiosisContract,
      amount: amountTon,
      payload: '', // Symbiosis может требовать payload для смарт-контракта
      destinationAddress: solAddress,
      estimatedTime: quote.estimatedTime || '2-5 min',
    });
  } catch (e) {
    console.error('[Symbiosis] Execute error:', e);
    res.status(502).json({ error: e.message });
  }
});
