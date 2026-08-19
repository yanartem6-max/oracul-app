// Vercel Serverless Function - прокси для API запросов

export default async function handler(req, res) {
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const path = req.url;
  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
  const feeAccount = process.env.FEE_ACCOUNT || '';
  
  // ─── AI Chat ──────────────────────────────────────────────────────────────
  if (path === '/api/chat' && req.method === 'POST') {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });
      
      if (!groqKey) return res.status(400).json({ error: 'GROQ_API_KEY not set' });
      
      const systemPrompt = `Ты — Оракул, ИИ-помощник крипто-платформы ORACUL.
Ты эксперт по мем-коинам, DeFi, Solana, TON.
Отвечай кратко и по делу. Анализируй монеты, объясняй риски, давай советы.
Всегда предупреждай о рисках. Отвечай на языке пользователя.`;
      
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-20)
          ],
          temperature: 0.7,
          max_tokens: 600
        })
      });
      
      if (!groqRes.ok) {
        const err = await groqRes.text();
        console.error('Groq error:', groqRes.status, err);
        return res.status(502).json({ error: 'Groq API error' });
      }
      
      const data = await groqRes.json();
      return res.json({ reply: data.choices?.[0]?.message?.content?.trim() || '' });
    } catch (e) {
      console.error('chat error:', e);
      return res.status(500).json({ error: 'internal error' });
    }
  }
  
  // ─── DexScreener Trending ─────────────────────────────────────────────────
  if (path === '/api/coins/trending' && req.method === 'GET') {
    try {
      const queries = ['BONK','WIF','POPCAT','PEPE','SHIB','DOGE','FLOKI','BRETT','MOODENG','PNUT'];
      const results = await Promise.allSettled(
        queries.map(q =>
          fetch(`https://api.dexscreener.com/latest/dex/search?q=${q}`, {
            headers: { 'User-Agent': 'ORACUL/1.0' }
          }).then(r => r.json()).then(d => {
            const pairs = (d.pairs || [])
              .filter(p => (p.liquidity?.usd || 0) >= 500 && (p.volume?.h24 || 0) >= 1000)
              .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
            return pairs[0] || null;
          })
        )
      );
      const pairs = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
      return res.json(pairs);
    } catch (e) {
      console.error('trending error:', e);
      return res.status(502).json({ error: e.message });
    }
  }
  
  // ─── DexScreener New ──────────────────────────────────────────────────────
  if (path === '/api/coins/new' && req.method === 'GET') {
    try {
      const boostRes = await fetch('https://api.dexscreener.com/token-boosts/latest/v1', {
        headers: { 'User-Agent': 'ORACUL/1.0' }
      });
      if (!boostRes.ok) throw new Error('dexscreener ' + boostRes.status);
      const boosts = await boostRes.json();
      const top = (Array.isArray(boosts) ? boosts : []).slice(0, 20);
      
      const enriched = await Promise.allSettled(
        top.map(async b => {
          const r = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${b.tokenAddress}`,
            { headers: { 'User-Agent': 'ORACUL/1.0' } }
          );
          const d = await r.json();
          const pair = (d.pairs || [])
            .filter(p => (p.liquidity?.usd || 0) >= 500 && (p.volume?.h24 || 0) >= 1000)
            .sort((a, b2) => (b2.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
          return pair || null;
        })
      );
      const pairs = enriched.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
      return res.json(pairs);
    } catch (e) {
      console.error('new coins error:', e);
      return res.status(502).json({ error: e.message });
    }
  }
  
  // ─── DexScreener Search ───────────────────────────────────────────────────
  if (path.startsWith('/api/coins/search') && req.method === 'GET') {
    try {
      const url = new URL(req.url || '', 'http://localhost');
      const q = url.searchParams.get('q');
      if (!q) return res.status(400).json({ error: 'q required' });
      
      const r = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': 'ORACUL/1.0' } }
      );
      if (!r.ok) throw new Error('dexscreener ' + r.status);
      const data = await r.json();
      return res.json(data.pairs || []);
    } catch (e) {
      return res.status(502).json({ error: e.message });
    }
  }
  
  // ─── DexScreener Token Details ────────────────────────────────────────────
  if (path.match(/^\/api\/coins\/[A-Za-z0-9]+$/) && req.method === 'GET') {
    try {
      const address = path.split('/').pop();
      const r = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`,
        { headers: { 'User-Agent': 'ORACUL/1.0' } }
      );
      if (!r.ok) throw new Error('dexscreener ' + r.status);
      return res.json(await r.json());
    } catch (e) {
      return res.status(502).json({ error: e.message });
    }
  }
  
  // ─── Jupiter Swap Quote ───────────────────────────────────────────────────
  if (path === '/api/swap/quote' && req.method === 'POST') {
    try {
      const { inputMint, outputMint, amount, slippageBps = 100 } = req.body;
      if (!inputMint || !outputMint || !amount)
        return res.status(400).json({ error: 'inputMint, outputMint, amount required' });
      
      const feeParam = feeAccount ? `&platformFeeBps=50&feeAccount=${feeAccount}` : '';
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}${feeParam}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error('jupiter ' + r.status);
      return res.json(await r.json());
    } catch (e) {
      console.error('swap quote error:', e);
      return res.status(502).json({ error: e.message });
    }
  }
  
  // ─── Jupiter Swap Transaction ─────────────────────────────────────────────
  if (path === '/api/swap/transaction' && req.method === 'POST') {
    try {
      const { quoteResponse, userPublicKey } = req.body;
      if (!quoteResponse || !userPublicKey)
        return res.status(400).json({ error: 'quoteResponse and userPublicKey required' });
      
      const body = {
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        ...(feeAccount ? { feeAccount } : {})
      };
      
      const r = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!r.ok) throw new Error('jupiter ' + r.status);
      return res.json(await r.json());
    } catch (e) {
      console.error('swap tx error:', e);
      return res.status(502).json({ error: e.message });
    }
  }
  
  // ─── Copy Trading - Top Traders ───────────────────────────────────────────
  if (path === '/api/traders/top' && req.method === 'GET') {
    try {
      const traders = [
        { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', name: 'Solana Whale 🐋', pnl30d: 45.2, swaps30d: 23 },
        { address: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKH', name: 'Meme Hunter 🎯', pnl30d: 32.8, swaps30d: 41 },
        { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', name: 'DeFi Degen ⚡', pnl30d: 18.5, swaps30d: 67 },
      ];
      return res.json(traders);
    } catch (e) {
      return res.status(502).json({ error: e.message });
    }
  }
  
  // ─── TON Price ────────────────────────────────────────────────────────────
  if (path === '/api/ton/price' && req.method === 'GET') {
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ton&vs_currencies=usd', {
        headers: { 'User-Agent': 'ORACUL/1.0' }
      });
      if (!r.ok) throw new Error('CoinGecko error');
      const data = await r.json();
      return res.json({ price: data?.ton?.usd || 3.5 });
    } catch (e) {
      console.error('TON price error:', e);
      return res.status(502).json({ error: e.message });
    }
  }
  
  // ─── TON Swap Quote ───────────────────────────────────────────────────────
  if (path === '/api/ton/swap/quote' && req.method === 'POST') {
    try {
      const { amountIn, tokenIn, tokenOut } = req.body;
      if (!amountIn || !tokenIn || !tokenOut)
        return res.status(400).json({ error: 'amountIn, tokenIn, tokenOut required' });
      
      const params = new URLSearchParams({
        ask_token: tokenOut,
        offer_token: tokenIn,
        units: amountIn.toString(),
        slippage_tolerance: '1.0'
      });
      
      const r = await fetch(`https://api.ston.fi/v1/swap?${params}`, {
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'ORACUL/1.0' 
        }
      });
      
      if (!r.ok) throw new Error('Ston.fi error: ' + r.status);
      const quote = await r.json();
      const amountOut = quote.routes?.[0]?.ask_amount || '0';
      const slippage = quote.routes?.[0]?.slippage_percent || 0.5;
      
      return res.json({ amountOut, slippage, route: quote.routes?.[0] });
    } catch (e) {
      console.error('TON swap quote error:', e);
      return res.status(502).json({ error: e.message });
    }
  }
  
  // 404 для неизвестных маршрутов
  return res.status(404).json({ error: 'Not found' });
}
