// Динамический загрузчик TON Connect UI
export async function loadTonConnectUI() {
  // Если уже загружен - возвращаем
  if (window.TonConnectUIConstructor) {
    return window.TonConnectUIConstructor;
  }

  // Пробуем загрузить из глобального объекта (если скрипт из CDN уже загружен)
  if (window.TonConnectUI) {
    window.TonConnectUIConstructor = window.TonConnectUI;
    return window.TonConnectUI;
  }

  // Динамически загружаем модуль
  try {
    const module = await import('https://cdn.jsdelivr.net/npm/@tonconnect/ui@2.0.6/+esm');
    window.TonConnectUIConstructor = module.TonConnectUI;
    return module.TonConnectUI;
  } catch (e) {
    console.error('[TON Connect Loader] Failed to load:', e);
    
    // Fallback: ждём загрузки из script tag
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.TonConnectUI) {
          clearInterval(checkInterval);
          window.TonConnectUIConstructor = window.TonConnectUI;
          resolve(window.TonConnectUI);
        } else if (attempts > 100) { // 10 секунд
          clearInterval(checkInterval);
          reject(new Error('TonConnectUI failed to load after 10 seconds'));
        }
      }, 100);
    });
  }
}
