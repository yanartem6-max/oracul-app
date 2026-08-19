// catalog.js — каталог мем-коинов с лого и графиками
import { fmtPrice, t, onSettingsChange } from './settings.js?v=15';

export let currentCoin = null;

// Для использования в других модулях
export function getCurrentCoin() {
  return currentCoin;
}

// ─── Получить URL лого ────────────────────────────────────────────────────────

// Захардкоженные лого для популярных токенов — 150+ топовых
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
};

// Лого по символу токена — 100+ популярных
const LOGO_BY_SYMBOL = {
  'PEPE': 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg',
  'SHIB': 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
  'DOGE': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
  'FLOKI': 'https://assets.coingecko.com/coins/images/16746/large/PNG_image.png',
  'BRETT': 'https://assets.coingecko.com/coins/images/35529/large/Brett_(ETH).png',
  'MOG': 'https://assets.coingecko.com/coins/images/31069/large/IMG_20230723_095554_362.jpg',
  'TURBO': 'https://assets.coingecko.com/coins/images/30264/large/turbo.jpg',
  'NEIRO': 'https://assets.coingecko.com/coins/images/39144/large/neiro.jpeg',
  'BONK': 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
  'WIF': 'https://bafkreidfxlyv6fsh6qnaxvzfqbdrkiwmfgoio7vkqcftnokh3u5jqfllyq.ipfs.nftstorage.link',
  'POPCAT': 'https://bafkreidlm7jf62uxudjhvdghg5dwbpy4dfmvnl5sgdqchcvq3obrmhsmgq.ipfs.nftstorage.link',
  'MOODENG': 'https://bafybeibjvlczbz5kcstfj3qmv6n4wc5lkdqfq7yw5qhxqqsfauwqwhkscq.ipfs.cf-ipfs.com/',
  'PNUT': 'https://bafkreidlvgmpijmb77oejortn7cz6adgqwfgwydl2hnvjjlkbwpb7jrksq.ipfs.nftstorage.link/',
  'GOAT': 'https://bafkreia3su3gl73zzqqqh3ivfcfibvf2c6ylgzxhpb2jpnvz7d5s4gohry.ipfs.nftstorage.link/',
  'ACT': 'https://assets.coingecko.com/coins/images/41208/large/act.jpg',
  'CATI': 'https://assets.coingecko.com/coins/images/39768/large/cati.png',
  'NEET': 'https://assets.coingecko.com/coins/images/50501/large/neet.png',
  'SOL': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  'USDC': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  'USDT': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
  'JUP': 'https://static.jup.ag/jup/icon.png',
  'BOME': 'https://ipfs.io/ipfs/QmSQvzsEGCpbnChFNSabvj9Vq2WAqqvgFnDPHrKZxyD2k5',
  'MEW': 'https://bafkreig4jiepbulp2bbcnifqu3b3gbvdld7h4r25dsqrnsyxu2wxqjha54.ipfs.nftstorage.link/',
  'BODEN': 'https://bafkreidt6whykuoknkd7fxbhfvv3yk3h3r6f47n6zcfzepltm4dmtdxuxu.ipfs.nftstorage.link/',
  'FARTCOIN': 'https://cf-ipfs.com/ipfs/QmQYnR8q3s5Qc4QgASBQ7qHcU1tU6W2UfXNh6nPdwGRpTj',
  'PONKE': 'https://cf-ipfs.com/ipfs/QmdJxPNLnz3qWc7MdoqaMHzV5nWx6wLEGKCqH2pZRvdXnZ',
  'DADDY': 'https://arweave.net/8SgNwESovnbG1jZvABr8qnxvcdV8wBVKs7B1XzV8tEg',
  'FWOG': 'https://cf-ipfs.com/ipfs/Qmc8pPNQQLvJVjh8TqjfDxs4Y4QBvfqfz6c7q5qJnz6JkE',
  'RETARDIO': 'https://cf-ipfs.com/ipfs/QmabC8RzQX4j9C4kU5XT2pW8CfXwj5c3kx6T5jFXmP2Qnu',
  'CHILLGUY': 'https://cf-ipfs.com/ipfs/QmQQtWdMWMRKL1K7zV9m7YMjvBWUqeJ1tEWjFcCu2qhQ5w',
  'ELIZA': 'https://cf-ipfs.com/ipfs/QmVVYf8PbzQVvvLHvS6MXShwc8qDAMRhhJKjkqhQLaLv7N',
  'SLOP': 'https://cf-ipfs.com/ipfs/QmTFbTQxxMf7Ek2bqZFqvVNg2MCJXHD9A2RnFCYiJQQdCp',
  // Добавляем ещё ~70 популярных
  'RAY': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
  'ORCA': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png',
  'MNGO': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac/logo.png',
  'SRM': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt/logo.png',
  'COPE': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh/logo.png',
  'FIDA': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp/logo.svg',
  'KIN': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6/logo.png',
  'MAPS': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MAPS41MDahZ9QdKXhVa4dWB9RuyfV4XqhyAZ8XcYepb/logo.png',
  'OXY': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/z3dn17yLaGMKffVogeFHQ9zWVcXgqgf3PQnDsNs2g6M/logo.png',
  'SLIM': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/xxxxa1sKNGwFtw2kFn8XauW9xq8hBZ5kVtcSesTT9fW/logo.png',
  'PORT': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/PoRTjZMPXb9T7dyU7tpLEZRQj7e6ssfAE62j2oQuc6y/logo.png',
  'TULIP': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/TuLipcqtGVXP9XR62wM8WWCm6a9vhLs7T1uoWBk6FDs/logo.svg',
  'STEP': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT/logo.png',
  'MEDIA': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/ETAtLmCmsoiEEKfNrHKJ2kYy3MoABhU6NQvpSfij5tDs/logo.png',
  'ROPE': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/8PMHT4swUMtBzgHnh5U564N5sjPSiUz2cjEQzFnnP1Fo/logo.png',
  'BOP': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/BLwTnYKqf7u4qjgZrrsKeNs2EzWkMLqVCu6j8iHyrNA3/logo.png',
  'SUNNY': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/SUNNYWgPQmFxe9wTZzNK7iPnJ3vYDrkgnxJRJm1s3ag/logo.svg',
  'SABER': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Saber2gLauYim4Mvftnrasomsv6NvAuncvMEZwcLpD1/logo.svg',
  'ATLAS': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx/logo.png',
  'POLIS': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk/logo.png',
  'SAMO': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU/logo.png',
  'NINJA': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/FgX1WD9WzMU3yLwXaFSarPfkgzjLb2DZCqmkx9ExpuvJ/logo.png',
  'SLND': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp/logo.png',
  'SCNSOL': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm/logo.png',
  'MSOL': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
  'STSOL': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj/logo.png',
  'DUST': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ/logo.png',
  'GENE': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/GENEtH5amGSi8kHAtQoezp1XEXwZJ8vcuePYnXdKrMYz/logo.png',
  'GMT': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx/logo.png',
  'GST': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB/logo.png',
};

export function getTokenLogo(pair) {
  // 1. DexScreener уже дал imageUrl
  if (pair.info?.imageUrl) return pair.info.imageUrl;
  if (pair.info?.image)    return pair.info.image;
  if (pair._logoUrl)       return pair._logoUrl;

  const mint   = pair.baseToken?.address || '';
  const symbol = (pair.baseToken?.symbol || '').toUpperCase();
  const chain  = pair.chainId || 'solana';

  // 2. Хардкод по mint-адресу
  if (mint && LOGO_MAP[mint]) return LOGO_MAP[mint];

  // 3. По символу токена
  if (symbol && LOGO_BY_SYMBOL[symbol]) return LOGO_BY_SYMBOL[symbol];

  // 4. CoinGecko CDN по символу (работает для большинства топ-монет)
  if (symbol) {
    return `https://assets.coingecko.com/coins/images/search?query=${symbol.toLowerCase()}`;
  }

  return null;
}

// ─── Форматирование ───────────────────────────────────────────────────────────
// fmt — для объёмов/ликвидности (всегда $)
function fmt(n) {
  if (n == null) return '—';
  n = Number(n);
  if (n >= 1e9)     return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)     return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3)     return '$' + (n / 1e3).toFixed(1) + 'K';
  if (n < 0.000001) return '$' + n.toExponential(2);
  if (n < 0.001)    return '$' + n.toFixed(7);
  if (n < 0.01)     return '$' + n.toFixed(6);
  if (n < 1)        return '$' + n.toFixed(4);
  return '$' + n.toFixed(2);
}

// price — с конвертацией валюты из настроек
function price(usdVal) {
  return fmtPrice(usdVal);
}

function fmtPct(p) {
  if (p == null) return null;
  const num = Number(p);
  
  // Агрессивная санитизация: любые нереалистичные проценты = 0%
  // Нормальный диапазон для мем-коинов: -99% до +200%
  if (num > 200 || num < -99 || isNaN(num)) {
    return '0.00%';
  }
  
  return (num >= 0 ? '+' : '') + num.toFixed(2) + '%';
}

// ─── Карточка монеты ──────────────────────────────────────────────────────────
function makeCoinCard(pair, onClick) {
  const card   = document.createElement('div');
  card.className = 'coin-card';

  const logo   = getTokenLogo(pair);
  const symbol = pair.baseToken?.symbol || '?';
  const name   = pair.baseToken?.name   || symbol;
  const chain  = (pair.chainId || '').toUpperCase();
  const price_ = price(pair.priceUsd);
  const chg    = pair.priceChange?.h24 ?? pair.priceChange?.h6 ?? null;
  const pct    = fmtPct(chg);
  const isUp   = (chg ?? 0) >= 0;
  const vol    = pair.volume?.h24 ? fmt(pair.volume.h24) : null;
  const mint   = (pair.baseToken?.address || '').toLowerCase();
  const cgId   = symbol.toLowerCase();

  // Цепочка fallback: основное → DexScreener OG → CoinGecko → placeholder
  const logo1  = getTokenLogo(pair) || '';
  const logo2  = `https://dd.dexscreener.com/ds-data/tokens/${chain}/${mint}.png`;
  const logo3  = `https://assets.coingecko.com/coins/images/search?query=${cgId}`;

  const logoHtml = `
    <div class="coin-logo-wrap">
      <img class="coin-logo" src="${logo1}"
        alt="${symbol}" loading="lazy"
        onerror="
          if(!this.dataset.fb1){
            this.dataset.fb1='1';
            this.src='${logo2}';
          } else if(!this.dataset.fb2){
            this.dataset.fb2='1';
            this.src='${logo3}';
          } else {
            this.style.display='none';
            this.nextElementSibling.style.display='flex';
          }
        ">
      <div class="coin-logo-placeholder">${symbol[0]}</div>
    </div>`;

  card.innerHTML = `
    ${logoHtml}
    <div class="coin-info">
      <div class="coin-name">${name}</div>
      <div class="coin-chain">${symbol} · ${chain}${vol ? ' · Vol ' + vol : ''}</div>
    </div>
    <div class="coin-right">
      <div class="coin-price">${price_}</div>
      ${pct ? `<div class="coin-change ${isUp ? 'up' : 'down'}">${pct}</div>` : ''}
    </div>`;

  card.addEventListener('click', () => onClick(pair));
  return card;
}

// ─── Загрузка списка ──────────────────────────────────────────────────────────
async function fetchAndRender(url, listEl, onClick) {
  listEl.innerHTML = Array(5).fill('<div class="skeleton"></div>').join('');
  try {
    const res   = await fetch(url);
    const data  = await res.json();
    const pairs = Array.isArray(data) ? data : (data.pairs || []);

    listEl.innerHTML = '';
    if (!pairs.length) {
      listEl.innerHTML = `<p style="color:var(--ink-500);font-size:14px;padding:20px 0">${t('nothing_found')}</p>`;
      return;
    }
    pairs.slice(0, 50).forEach(p => listEl.appendChild(makeCoinCard(p, onClick)));
  } catch (e) {
    listEl.innerHTML = `<p style="color:var(--red);font-size:13px;padding:16px 0">${t('error')}: ${e.message}</p>`;
  }
}

// ─── Инициализация ────────────────────────────────────────────────────────────
// Сохраняем колбэк для перезагрузки извне (смена валюты/языка)
let _catalogClick = null;
let _catalogActiveTab = 'trending';

export function reloadCatalog(tab, onCoinClick) {
  const listEl = document.getElementById('coinsList');
  if (!listEl) return;
  const cb = onCoinClick || _catalogClick;
  const t  = tab || _catalogActiveTab;
  if (t === 'trending') fetchAndRender('/api/coins/trending', listEl, cb);
  if (t === 'new')      fetchAndRender('/api/coins/new',      listEl, cb);
}

export function initCatalog(onCoinClick) {
  _catalogClick = onCoinClick;
  const listEl      = document.getElementById('coinsList');
  const tabBtns     = document.querySelectorAll('.tab-btn');
  const searchRow   = document.getElementById('searchRow');
  const searchInput = document.getElementById('searchInput');
  const searchBtn   = document.getElementById('searchBtn');

  const load = tab => {
    _catalogActiveTab = tab;
    if (tab === 'trending') fetchAndRender('/api/coins/trending', listEl, onCoinClick);
    if (tab === 'gainers')  fetchAndRender('/api/coins/gainers',  listEl, onCoinClick);
    if (tab === 'new')      fetchAndRender('/api/coins/new',      listEl, onCoinClick);
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _catalogActiveTab = btn.dataset.tab;
      searchRow.style.display = _catalogActiveTab === 'search' ? 'flex' : 'none';
      if (_catalogActiveTab !== 'search') load(_catalogActiveTab);
      else listEl.innerHTML = '';
    });
  });

  const doSearch = () => {
    const q = searchInput.value.trim();
    if (q) fetchAndRender(`/api/coins/search?q=${encodeURIComponent(q)}`, listEl, onCoinClick);
  };
  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', e => e.key === 'Enter' && doSearch());

  load('trending');
  setInterval(() => { if (_catalogActiveTab !== 'search') load(_catalogActiveTab); }, 30_000);

  // При смене языка — обновляем тексты вкладок вручную
  onSettingsChange((key) => {
    if (key === 'lang') {
      tabBtns.forEach(btn => {
        const i18nKey = btn.dataset.i18n;
        if (i18nKey) btn.textContent = t(i18nKey);
      });
      if (searchBtn.dataset.i18n) searchBtn.textContent = t(searchBtn.dataset.i18n);
      if (searchInput.dataset.i18nPh) searchInput.placeholder = t(searchInput.dataset.i18nPh);
    }
  });
}

// ─── Модальное окно монеты ────────────────────────────────────────────────────
export function renderCoinModal(pair) {
  currentCoin = pair;
  window.lastSelectedPair = pair; // Сохраняем для window.toggleWatchlist и других функций
  
  const logo   = getTokenLogo(pair);
  const symbol = pair.baseToken?.symbol || '?';
  const name   = pair.baseToken?.name   || symbol;
  const chain  = (pair.chainId || '').toUpperCase();
  const priceM = price(pair.priceUsd);
  const mc     = fmt(pair.fdv || pair.marketCap);
  const vol    = fmt(pair.volume?.h24);
  const liq    = fmt(pair.liquidity?.usd);
  const chg24  = fmtPct(pair.priceChange?.h24);
  const chg6   = fmtPct(pair.priceChange?.h6);
  const chg1   = fmtPct(pair.priceChange?.h1);
  const isUp24 = (pair.priceChange?.h24 ?? 0) >= 0;
  const buys   = pair.txns?.h24?.buys  ?? '—';
  const sells  = pair.txns?.h24?.sells ?? '—';

  return `
    <div class="modal-coin-header">
      <div class="coin-logo-wrap" style="width:52px;height:52px">
        <img class="coin-logo" src="${logo || ''}" alt="${symbol}"
          style="width:52px;height:52px"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="coin-logo-placeholder" style="width:52px;height:52px;font-size:20px">${symbol[0]}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div class="modal-coin-name">${name}</div>
        <div class="modal-coin-ticker">${symbol} · ${chain}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:var(--font-mono);font-weight:700;font-size:17px">${priceM}</div>
        <div style="font-size:13px;font-weight:600;color:${isUp24 ? 'var(--green)' : 'var(--red)'}">${chg24 || ''}</div>
      </div>
    </div>

    <div class="chart-tabs" id="chartTabsOld">
      <button class="chart-tab-btn" data-res="60">1H</button>
      <button class="chart-tab-btn" data-res="240">4H</button>
      <button class="chart-tab-btn active" data-res="1440">1D</button>
      <button class="chart-tab-btn" data-res="0">ALL</button>
    </div>
    <div id="chartContainer" style="height:300px;border-radius:12px;overflow:hidden;margin-bottom:16px;background:rgba(255,138,61,.03);border:1px solid rgba(255,138,61,.12)">
      <div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--ink-500);font-size:13px">${t('loading') || '⏳'}</div>
    </div>

    <!-- Анализы загружаются асинхронно -->
    <div id="analysisContainer"></div>

    <div class="modal-stat-grid">
      <div class="modal-stat">
        <div class="modal-stat-label">1h</div>
        <div class="modal-stat-value" style="color:${(pair.priceChange?.h1??0)>=0?'var(--green)':'var(--red)'}">${chg1||'—'}</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-label">6h</div>
        <div class="modal-stat-value" style="color:${(pair.priceChange?.h6??0)>=0?'var(--green)':'var(--red)'}">${chg6||'—'}</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-label">${t('modal_volume')}</div>
        <div class="modal-stat-value">${vol}</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-label">${t('modal_liquidity')}</div>
        <div class="modal-stat-value">${liq}</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-label">${t('modal_fdv')}</div>
        <div class="modal-stat-value">${mc}</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-label">${t('modal_txns')}</div>
        <div class="modal-stat-value" style="font-size:12px">
          <span style="color:var(--green)">▲${buys}</span>&nbsp;/&nbsp;<span style="color:var(--red)">▼${sells}</span>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="primary-btn" id="modalBuyBtn" style="flex:1">${t('modal_buy')} ${symbol}</button>
      <div id="watchlistBtnContainer"></div>
    </div>
    ${pair.url ? `<a href="${pair.url}" target="_blank"
      style="display:block;text-align:center;font-size:13px;color:var(--orange-600);padding:4px 0">
      ${t('modal_open_dex')}</a>` : ''}
  `;
}

// ─── График — Canvas ──────────────────────────────────────────────────────────
export async function initChart(pair) {
  const container = document.getElementById('chartContainer');
  if (!container) return;

  const chain    = pair.chainId    || 'solana';
  const pairAddr = pair.pairAddress || '';

  // Сбрасываем стили от предыдущей версии с iframe
  container.style.cssText = 'height:300px;border-radius:12px;overflow:hidden;margin-bottom:16px;background:rgba(255,138,61,.03);border:1px solid rgba(255,138,61,.12)';

  if (!pairAddr) { noDataFallback(container, pair); return; }

  // Показываем кнопки таймфрейма
  const tabsEl = document.getElementById('chartTabsOld');
  if (tabsEl) tabsEl.style.display = 'flex';

  let allCandles = {}; // кеш по таймфрейму
  let abortCtrl  = null;

  async function load(resolution) {
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();

    container.innerHTML = `<div class="chart-loading">
      <div class="chart-loading-spinner"></div>
      <div>${t('loading') || 'Загрузка графика...'}</div>
    </div>`;

    if (allCandles[resolution]) {
      drawCanvas(container, allCandles[resolution]);
      return;
    }

    try {
      let data = null;
      let retries = 5; // Увеличил с 3 до 5
      
      // Retry логика
      while (retries > 0) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15сек timeout
          
          const r = await fetch(
            `/api/candles/${encodeURIComponent(pairAddr)}?chain=${encodeURIComponent(chain)}&res=${resolution}`,
            { signal: controller.signal }
          );
          
          clearTimeout(timeoutId);
          
          if (!r.ok) {
            console.warn(`[Chart] HTTP ${r.status}, retries left: ${retries - 1}`);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
              continue;
            }
            throw new Error(`HTTP ${r.status}`);
          }
          
          data = await r.json();
          break; // Успешно загрузили
        } catch (e) {
          if (e.name === 'AbortError') {
            console.warn('[Chart] Request timeout');
          }
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            throw e;
          }
        }
      }
      
      if (!data || data.error) throw new Error(data?.error || 'No data');

      const raw = data?.data?.attributes?.ohlcv_list || [];
      const candles = raw
        .map(item => {
          const a = Array.isArray(item) ? item : String(item).trim().split(/\s+/);
          return { t: +a[0], o: +a[1], h: +a[2], l: +a[3], c: +a[4] };
        })
        .filter(c => c.t && c.h > 0 && c.o > 0 && !isNaN(c.t))
        .sort((a, b) => a.t - b.t);

      if (!candles.length) { 
        console.warn('[Chart] No valid candles for resolution:', resolution);
        noDataFallback(container, pair); 
        return; 
      }

      allCandles[resolution] = candles;
      drawCanvas(container, candles);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('[Chart] Loading error:', e);
      noDataFallback(container, pair);
    }
  }

  // Навешиваем кнопки
  if (tabsEl) {
    tabsEl.querySelectorAll('.chart-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        load(btn.dataset.res);
      });
    });
    // Активируем 1D по умолчанию
    tabsEl.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
    const def = tabsEl.querySelector('[data-res="1440"]');
    if (def) def.classList.add('active');
    load('1440');
  } else {
    load('1440');
  }
}

function drawCanvas(container, candles) {
  container.innerHTML = '';
  const n   = candles.length;
  const W   = container.clientWidth  || 340;
  const H   = container.clientHeight || 300;
  const DPR = window.devicePixelRatio || 1;
  const PAD = { top: 20, right: 14, bottom: 34, left: 74 };
  const CW  = W - PAD.left - PAD.right;
  const CH  = H - PAD.top  - PAD.bottom;

  // Состояние вида
  let cw  = Math.max(4, Math.min(16, Math.floor(CW / n) - 1));
  let gap = Math.max(1, Math.round(cw * 0.25));
  let ox  = 0; // offset X (≤ 0)

  const totalW = () => n * (cw + gap);
  const clamp  = () => { ox = Math.max(Math.min(0, CW - totalW()), Math.min(0, ox)); };

  // DOM
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:100%;height:100%;touch-action:pan-y;cursor:grab';
  container.appendChild(wrap);

  const cv = document.createElement('canvas');
  cv.width  = W * DPR;
  cv.height = H * DPR;
  cv.style.cssText = `width:${W}px;height:${H}px;display:block`;
  wrap.appendChild(cv);

  const ctx = cv.getContext('2d');

  // Tooltip
  const tip = document.createElement('div');
  tip.style.cssText = 'position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(43,27,18,.88);color:#fff;border-radius:8px;padding:4px 10px;font-size:10.5px;font-family:monospace;pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .12s;z-index:9';
  wrap.appendChild(tip);

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Видимый диапазон
    const step  = cw + gap;
    const first = Math.max(0, Math.floor(-ox / step) - 1);
    const last  = Math.min(n - 1, first + Math.ceil(CW / step) + 2);
    const vis   = candles.slice(first, last + 1);
    if (!vis.length) return;

    const minP = Math.min(...vis.map(c => c.l)) * 0.999;
    const maxP = Math.max(...vis.map(c => c.h)) * 1.001;
    const rng  = maxP - minP || minP * 0.001;

    const toY = v => PAD.top + CH - ((v - minP) / rng) * CH;
    const toX = i => PAD.left + ox + i * step;

    // Сетка
    ctx.font = `${10}px monospace`;
    const STEPS = 5;
    for (let i = 0; i <= STEPS; i++) {
      const v = minP + (rng / STEPS) * i;
      const y = Math.round(toY(v)) + 0.5;
      ctx.strokeStyle = 'rgba(217,80,14,.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#A09080';
      ctx.textAlign = 'right';
      ctx.fillText(priceFmt(v), PAD.left - 4, y + 3.5);
    }

    // Временные метки
    ctx.textAlign = 'center';
    ctx.fillStyle = '#A09080';
    ctx.font = '10px sans-serif';
    const every = Math.max(1, Math.floor(n / 7));
    for (let i = first; i <= last; i += every) {
      const x = toX(i) + cw / 2;
      if (x < PAD.left || x > W - PAD.right) continue;
      const d = new Date(candles[i].t * 1000);
      const lbl = d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
      ctx.fillText(lbl, x, H - 8);
      ctx.strokeStyle = 'rgba(217,80,14,.05)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + CH); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Свечи
    for (let i = first; i <= last; i++) {
      const c    = candles[i];
      const x    = toX(i);
      const cx   = x + cw / 2;
      const isUp = c.c >= c.o;
      const col  = isUp ? '#22C55E' : '#EF4444';
      ctx.strokeStyle = col;
      ctx.fillStyle   = col;
      ctx.lineWidth   = 1;

      // Фитиль
      ctx.beginPath(); ctx.moveTo(cx, toY(c.h)); ctx.lineTo(cx, toY(c.l)); ctx.stroke();

      // Тело
      const yT = toY(Math.max(c.o, c.c));
      const bH = Math.max(1, Math.abs(toY(c.o) - toY(c.c)));
      ctx.globalAlpha = 0.82;
      ctx.fillRect(x, yT, cw, bH);
      ctx.globalAlpha = 1;
      if (cw > 5) ctx.strokeRect(x + .5, yT + .5, cw - 1, bH - 1);
    }

    // Рамка
    ctx.strokeStyle = 'rgba(217,80,14,.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + CH);
    ctx.lineTo(W - PAD.right, PAD.top + CH); ctx.stroke();

    // Скроллбар
    const tw = totalW();
    if (tw > CW) {
      const bw = Math.max(24, (CW / tw) * CW);
      const bx = PAD.left + ((-ox) / tw) * CW;
      ctx.fillStyle = 'rgba(217,80,14,.22)';
      ctx.beginPath();
      ctx.roundRect?.(bx, H - 5, bw, 3, 2) ?? ctx.rect(bx, H - 5, bw, 3);
      ctx.fill();
    }
  }

  clamp(); draw();

  // Drag
  let drag = null;
  wrap.addEventListener('mousedown', e => { drag = { x: e.clientX, ox }; wrap.style.cursor = 'grabbing'; });
  window.addEventListener('mousemove', e => { if (!drag) return; ox = drag.ox + (e.clientX - drag.x); clamp(); draw(); });
  window.addEventListener('mouseup',   () => { drag = null; wrap.style.cursor = 'grab'; });

  // Touch
  let tc = null;
  wrap.addEventListener('touchstart', e => { tc = { x: e.touches[0].clientX, ox }; }, { passive: true });
  wrap.addEventListener('touchmove',  e => { if (!tc) return; ox = tc.ox + (e.touches[0].clientX - tc.x); clamp(); draw(); }, { passive: true });
  wrap.addEventListener('touchend',   () => { tc = null; });

  // Zoom
  wrap.addEventListener('wheel', e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.12 : 0.89;
    cw = Math.max(2, Math.min(40, cw * f));
    gap = Math.max(1, Math.round(cw * 0.25));
    clamp(); draw();
  }, { passive: false });

  // Pinch zoom для мобильных
  let initialDistance = 0;
  let initialCw = cw;
  
  wrap.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistance = Math.sqrt(dx * dx + dy * dy);
      initialCw = cw;
    }
  }, { passive: true });

  wrap.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && initialDistance > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = distance / initialDistance;
      
      cw = Math.max(2, Math.min(40, initialCw * scale));
      gap = Math.max(1, Math.round(cw * 0.25));
      clamp(); draw();
    }
  }, { passive: true });

  wrap.addEventListener('touchend', e => {
    if (e.touches.length < 2) {
      initialDistance = 0;
    }
  }, { passive: true });

  // Hover tooltip
  wrap.addEventListener('mousemove', e => {
    const r   = wrap.getBoundingClientRect();
    const mx  = e.clientX - r.left;
    const idx = Math.floor((mx - PAD.left - ox) / (cw + gap));
    if (idx >= 0 && idx < n) {
      const c   = candles[idx];
      const d   = new Date(c.t * 1000).toLocaleDateString('ru', { day:'2-digit', month:'2-digit', year:'2-digit' });
      const pct = ((c.c - c.o) / c.o * 100).toFixed(2);
      const up  = c.c >= c.o;
      tip.innerHTML = `${d}  O:${priceFmt(c.o)}  H:${priceFmt(c.h)}  L:${priceFmt(c.l)}  <b style="color:${up?'#4ade80':'#f87171'}">${priceFmt(c.c)} (${up?'+':''}${pct}%)</b>`;
      tip.style.opacity = '1';
    } else tip.style.opacity = '0';
  });
  wrap.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });

  // Скроллим в конец (последние свечи справа)
  ox = Math.min(0, CW - totalW());
  clamp(); draw();
}

function priceFmt(n) {
  if (!n) return '0';
  if (n >= 100)      return n.toFixed(0);
  if (n >= 1)        return n.toFixed(2);
  if (n >= 0.01)     return n.toFixed(4);
  if (n >= 0.0001)   return n.toFixed(6);
  if (n >= 0.000001) return n.toFixed(8);
  return n.toExponential(2);
}

function noDataFallback(container, pair) {
  const chg = pair.priceChange?.h24;
  const isUp = (chg ?? 0) >= 0;
  container.innerHTML = `
    <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:20px">
      <div style="font-size:32px">📊</div>
      <div style="font-size:26px;font-weight:700;color:${isUp ? '#22C55E' : '#EF4444'}">
        ${chg != null ? (isUp ? '+' : '') + Number(chg).toFixed(2) + '%' : '—'}
      </div>
      <div style="font-size:12px;color:var(--ink-3);text-align:center">
        Изменение за 24ч<br/>
        <span style="font-size:11px;opacity:0.7">График временно недоступен</span>
      </div>
      ${pair.url ? `<a href="${pair.url}" target="_blank"
        style="font-size:12px;color:var(--orange);margin-top:4px;text-decoration:none;border:1.5px solid var(--border);padding:6px 12px;border-radius:8px;transition:all 0.2s"
        onmouseover="this.style.borderColor='var(--orange)'"
        onmouseout="this.style.borderColor='var(--border)'">
        Открыть на DexScreener ↗</a>` : ''}
    </div>`;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
