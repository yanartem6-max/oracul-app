// ton-swap.js — свапы TON через Ston.fi DEX API

import { getWallet } from './wallet.js?v=15';
import { t } from './settings.js?v=15';

// TON native coin address
export const TON_MINT = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
// Wrapped SOL на TON (используется в пулах)
export const WSOL_MINT = 'EQB-kCHBwIApmsg_RF-RjGSwAu6yok2GDYyIH-McFxq_qCa';

// Ston.fi URLs
const STON_API = 'https://api.ston.fi/v1';

// Кеш котировок
let quotesCache = new Map();
const QUOTES_TTL = 30000; // 30 сек

/**
 * Получить котировку на Ston.fi
 */
export async function getTonSwapQuote(amountIn, tokenIn, tokenOut) {
  try {
    console.log('[TON-SWAP] получаю котировку:', { amountIn, tokenIn, tokenOut });

    const cacheKey = `${tokenIn}-${tokenOut}-${amountIn}`;
    const cached = quotesCache.get(cacheKey);
    if (cached && Date.now() - cached.time < QUOTES_TTL) {
      console.log('[TON-SWAP] использую кеш');
      return cached.data;
    }

    // Ston.fi v1 API для получения пути свопа
    const url = `${STON_API}/swap`;
    
    const params = new URLSearchParams({
      ask_token: tokenOut,
      offer_token: tokenIn,
      units: amountIn.toString(),
      slippage_tolerance: '1.0',
    });

    const r = await fetch(`${url}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ORACUL/1.0',
      }
    });

    if (!r.ok) {
      throw new Error(`Ston.fi error: ${r.status}`);
    }

    const data = await r.json();
    
    // Кешируем результат
    quotesCache.set(cacheKey, { data, time: Date.now() });

    return data;
  } catch (e) {
    console.error('[TON-SWAP] quote error:', e.message);
    throw e;
  }
}

/**
 * Получить список доступных пулов на Ston.fi
 */
export async function getStonfiBridgePools() {
  try {
    // Запрашиваем пулы с SOL и TON
    const r = await fetch(`${STON_API}/pools`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ORACUL/1.0',
      }
    });

    if (!r.ok) {
      throw new Error(`Ston.fi pools error: ${r.status}`);
    }

    const pools = await r.json();
    
    // Ищем пулы между TON и WSOL
    const bridgePools = pools.filter(p => 
      (p.token0.address === TON_MINT || p.token1.address === TON_MINT) &&
      (p.token0.address === WSOL_MINT || p.token1.address === WSOL_MINT)
    );

    console.log('[TON-SWAP] найдено пулов:', bridgePools.length);
    return bridgePools;
  } catch (e) {
    console.error('[TON-SWAP] pools error:', e.message);
    return [];
  }
}

/**
 * Получить цену TON/USD через Ston.fi
 */
export async function getTonPrice() {
  try {
    const r = await fetch(`${STON_API}/jettons`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ORACUL/1.0',
      }
    });

    if (!r.ok) return null;

    const jettons = await r.json();
    const ton = jettons.jettons?.find(j => 
      j.address === TON_MINT || j.address === 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'
    );

    if (ton?.price?.prices?.USD) {
      return parseFloat(ton.price.prices.USD);
    }
    return null;
  } catch (e) {
    console.error('[TON-SWAP] price error:', e.message);
    return null;
  }
}

/**
 * Создать транзакцию для свопа (требует TON Connect wallet)
 * Возвращает ссылку на подпись транзакции
 */
export async function createTonSwapTx(walletAddress, tokenIn, tokenOut, amountIn, quote) {
  try {
    console.log('[TON-SWAP] создаю транзакцию для адреса:', walletAddress);

    // Для реального свопа нужно построить транзакцию с использованием tonweb или ton-core
    // На данный момент это заглушка - в production нужна полная реализация
    
    // Ston.fi позволяет создавать custom транзакции через их контрактный интерфейс
    // Это требует использования ton-core и построения правильной структуры транзакции

    const txData = {
      amount: amountIn,
      tokenIn,
      tokenOut,
      slippage: quote.slippagePercent || 1.0,
      path: quote.routes?.[0],
    };

    console.log('[TON-SWAP] данные транзакции подготовлены:', txData);

    return {
      success: true,
      tx: txData,
      message: 'Транзакция подготовлена. Для выполнения требуется подпись кошельком.',
    };
  } catch (e) {
    console.error('[TON-SWAP] tx error:', e.message);
    throw e;
  }
}

/**
 * Сохранить историю свопа TON
 */
export function saveTonSwapHistory(swapData) {
  try {
    const history = JSON.parse(localStorage.getItem('oracul_ton_swaps') || '[]');
    history.push({
      ...swapData,
      timestamp: Date.now(),
    });
    // Сохраняем последние 50 свопов
    localStorage.setItem('oracul_ton_swaps', JSON.stringify(history.slice(-50)));
    console.log('[TON-SWAP] история сохранена');
  } catch (e) {
    console.error('[TON-SWAP] save history error:', e);
  }
}

/**
 * Получить историю свопов TON
 */
export function getTonSwapHistory() {
  try {
    return JSON.parse(localStorage.getItem('oracul_ton_swaps') || '[]');
  } catch {
    return [];
  }
}
