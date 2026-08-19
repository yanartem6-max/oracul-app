// settings.js — язык, валюта, тема (полная версия)

// ─── ПЕРЕВОДЫ ─────────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  ru: {
    // Навигация
    nav_catalog: 'Каталог', nav_swap: 'Свап',
    nav_ai: 'ИИ', nav_settings: 'Настройки', nav_profile: 'Профиль',
    nav_portfolio: 'Портфель', nav_watchlist: 'Избранное', nav_referral: 'Рефералы',
    // TON Wallet
    ton_wallet_connected: 'TON кошелёк подключён',
    ton_wallet_info: 'Вы подключены через TON Connect. Теперь можете обменивать TON на другие токены.',
    balance: 'Баланс',
    wallet_not_connected: 'Кошелёк не подключён',
    sol_address_required: 'Введите адрес Solana кошелька для получения',
    sol_address_invalid: 'Введите корректный Solana адрес',
    swap_route: 'Маршрут',
    swap_processing: 'Обработка займёт 2-5 минут',
    // Каталог
    tab_trending: 'Trending', tab_gainers: 'Растут', tab_new: 'Новые', tab_search: 'Поиск',
    search_placeholder: 'Тикер или адрес…', search_btn: '→',
    nothing_found: 'Ничего не найдено',
    vol: 'Объём',
    // Свап
    swap_title: 'Обмен токенов',
    swap_give: 'Отдаю', swap_get: 'Получаю',
    swap_quote_btn: 'Получить котировку',
    swap_platform_fee: 'Комиссия платформы',
    swap_slippage: 'Проскальзывание',
    swap_rate: 'Курс',
    swap_receive: 'Получаете',
    swap_disclaimer_title: '⚠️ Риски и безопасность',
    swap_risk1: 'Мем-коины крайне волатильны. Цена может упасть на 90%+ в любой момент.',
    swap_risk2: 'Свап выполняется через Jupiter — децентрализованный агрегатор. Транзакции необратимы.',
    swap_risk3: 'ORACUL не хранит и не передаёт данные вашего кошелька. Приватный ключ никогда не покидает устройство.',
    swap_risk4: 'Инвестируй только то, что готов потерять полностью.',
    // ИИ
    ai_placeholder: 'Спроси про монету, риски, стратегию…',
    // Кошелёк
    connect_wallet: 'Подключить',
    wallet_balance: 'Баланс',
    wallet_tokens: 'Токены',
    wallet_total: 'Общая стоимость',
    wallet_disconnect: 'Отключить кошелёк',
    wallet_my: 'Мой кошелёк',
    wallet_no_tokens: 'Токенов не найдено',
    wallet_connected: 'подключён',
    wallet_choose: 'Выбери кошелёк',
    wallet_connect_to_see: 'Подключи кошелёк чтобы увидеть историю',
    wallet_connect_first: 'Сначала подключи кошелёк',
    ton_wallet: 'TON кошелёк',
    // Свап статусы и сообщения
    swap_get_quote: 'Получить котировку',
    swap_confirm: 'Подтвердить свап',
    swap_calculating: '⏳ Считаю…',
    swap_enter_amount: 'Введи сумму',
    swap_loading: 'Получаю котировку…',
    swap_preparing: 'Подготовка транзакции…',
    swap_sign_wallet: 'Подпиши в кошельке…',
    swap_done: 'Готово!',
    swap_view_tx: 'Посмотреть транзакцию ↗',
    swap_try_again: 'Попробовать снова',
    swap_between_chains: '⚠️ Свап между цепями (TON → SOL) требует моста. Скоро добавим!',
    swap_unknown_wallet: '⚠️ Неизвестный тип кошелька',
    swap_initiated: 'Свап инициирован…',
    swap_recorded: '✓ Свап записан! Подпишите в кошельке для выполнения.',
    swap_completed: 'Свап выполнен',
    swap_error: '❌ Ошибка: ',
    swap_execute: 'Свапнуть',
    loading_transactions: 'Загружаю...',
    ai_connection_error: '⚠️ Ошибка связи с ИИ. Проверь сервер.',
    profile_total_balance: 'Общий баланс',
    profile_recent_activity: 'Недавние действия',
    profile_about: 'О приложении',
    no_actions: 'Нет действий',
    cancel: 'Отмена',
    // Настройки
    settings_title: 'Настройки',
    s_language: 'Язык', s_currency: 'Валюта', s_theme: 'Тема',
    s_about: 'О приложении', s_version: 'Версия',
    s_general: 'ОСНОВНОЕ', s_display: 'ОТОБРАЖЕНИЕ', s_info: 'ИНФОРМАЦИЯ',
    s_privacy_title: '🔒 Конфиденциальность',
    s_privacy_head: '🛡️ Мы не собираем ваши данные',
    s_privacy1: 'Приватный ключ кошелька никогда не передаётся на сервер',
    s_privacy2: 'ORACUL не хранит историю транзакций пользователей',
    s_privacy3: 'Подключение через официальный Phantom SDK',
    s_privacy4: 'Данные чата используются только для генерации ответа ИИ',
    s_risk_title: '⚠️ Риски',
    s_risk_head: 'Торговля криптовалютой несёт высокие риски',
    s_risk1: 'Мем-коины могут потерять 99% стоимости',
    s_risk2: 'ИИ-анализ — информационный, не финансовый совет',
    s_risk3: 'Делайте собственное исследование (DYOR)',
    s_risk4: 'Инвестируйте только средства, потеря которых допустима',
    // Модалка монеты
    modal_buy: 'Купить',
    modal_open_dex: 'Открыть на DexScreener ↗',
    modal_volume: 'Объём 24h', modal_liquidity: 'Ликвидность',
    modal_fdv: 'FDV / MCap', modal_txns: 'Сделок 24h',
    // Пикер токена
    pick_token: 'Выбрать токен',
    pick_search: 'Поиск…',
    loading: '⏳ Загружаю…',
    ai_greeting_bold: 'Привет! Я ИИ-Оракул ORACUL.',
    ai_greeting_help: 'Я помогу тебе:',
    ai_help1: 'Анализировать мем-коины и токены',
    ai_help2: 'Оценивать риски перед покупкой',
    ai_help3: 'Разбираться в DeFi и Solana',
    ai_help4: 'Находить интересные возможности',
    ai_greeting_end: 'Спроси меня про любую монету или стратегию 🚀',
    ai_disclaimer: '⚠️ ИИ может ошибаться. Всегда перепроверяй информацию самостоятельно!',
    terms: 'Условия',
    privacy_policy: 'Политика конфиденциальности',
    ai_footer: 'ORACUL— это ИИ. Используя его, вы соглашаетесь с',
    ai_footer_terms: 'Условиями',
    ai_footer_and: 'и',
    ai_footer_privacy: 'Политикой конфиденциальности',
    terms_h1: 'Условия использования ORACUL',
    terms_p1: '1. ORACUL - это инструмент для анализа крипто-активов на блокчейне Solana.',
    terms_p2: '2. Приватные ключи пользователей никогда не передаются на сервер.',
    terms_p3: '3. Пользователь несет полную ответственность за свои решения о покупке/продаже токенов.',
    terms_p4: '4. ORACUL предоставляет информацию в образовательных целях.',
    terms_p5: '5. Все данные получены из публичных APIs блокчейна.',
    terms_p6: '6. Использование сервиса означает согласие с этими условиями.',
    privacy_h1: 'Как мы защищаем ваши данные',
    privacy_p1: '1. ORACUL не хранит приватные ключи пользователей.',
    privacy_p2: '2. Все данные кошельков получаются напрямую из блокчейна через публичные APIs.',
    privacy_p3: '3. Мы не отслеживаем и не сохраняем личную информацию.',
    privacy_p4: '4. Соединение защищено HTTPS шифрованием.',
    privacy_p5: '5. Никакие персональные данные не передаются третьим лицам.',
    privacy_p6: '6. Вся обработка данных происходит локально в браузере.',
    error: 'Ошибка',
    // Темы
    theme_light: 'Светлая', theme_dark: 'Тёмная', theme_auto: 'Авто',
    ton_enter_address: 'Введи адрес TON кошелька:\n(формат: UQ... или EQ...)',
    confirm_action: 'Подтвердите действие',
    token_singular: 'токен',
    token_plural: 'токенов',
  },
  en: {
    nav_catalog: 'Catalog', nav_swap: 'Swap',
    nav_ai: 'AI', nav_settings: 'Settings', nav_profile: 'Profile',
    nav_portfolio: 'Portfolio', nav_watchlist: 'Watchlist', nav_referral: 'Referrals',
    // TON Wallet
    ton_wallet_connected: 'TON wallet connected',
    ton_wallet_info: 'You are connected via TON Connect. You can now swap TON for other tokens.',
    balance: 'Balance',
    wallet_not_connected: 'Wallet not connected',
    sol_address_required: 'Enter Solana wallet address to receive',
    sol_address_invalid: 'Enter valid Solana address',
    swap_route: 'Route',
    swap_processing: 'Processing will take 2-5 minutes',
    tab_trending: 'Trending', tab_gainers: 'Gainers', tab_new: 'New', tab_search: 'Search',
    search_placeholder: 'Ticker or address…', search_btn: '→',
    nothing_found: 'Nothing found',
    vol: 'Vol',
    swap_title: 'Token Exchange',
    swap_give: 'You pay', swap_get: 'You receive',
    swap_quote_btn: 'Get quote',
    swap_platform_fee: 'Platform fee',
    swap_slippage: 'Slippage',
    swap_rate: 'Rate',
    swap_receive: 'You receive',
    swap_disclaimer_title: '⚠️ Risks & Security',
    swap_risk1: 'Meme coins are extremely volatile. Price can drop 90%+ at any moment.',
    swap_risk2: 'Swap is executed via Jupiter — a decentralized aggregator. Transactions are irreversible.',
    swap_risk3: 'ORACUL does not store or transmit your wallet data. Private key never leaves your device.',
    swap_risk4: 'Only invest what you can afford to lose completely.',
    ai_placeholder: 'Ask about a coin, risks, strategy…',
    connect_wallet: 'Connect',
    wallet_balance: 'Balance',
    wallet_tokens: 'Tokens',
    wallet_total: 'Total value',
    wallet_disconnect: 'Disconnect wallet',
    wallet_my: 'My Wallet',
    wallet_no_tokens: 'No tokens found',
    wallet_connected: 'connected',
    wallet_choose: 'Choose wallet',
    wallet_connect_to_see: 'Connect wallet to see history',
    wallet_connect_first: 'Connect wallet first',
    ton_wallet: 'TON wallet',
    swap_get_quote: 'Get quote',
    swap_confirm: 'Confirm swap',
    swap_calculating: '⏳ Calculating…',
    swap_enter_amount: 'Enter amount',
    swap_loading: 'Getting quote…',
    swap_preparing: 'Preparing transaction…',
    swap_sign_wallet: 'Sign in wallet…',
    swap_done: 'Done!',
    swap_view_tx: 'View transaction ↗',
    swap_try_again: 'Try again',
    swap_between_chains: '⚠️ Swap between chains (TON → SOL) requires bridge. Coming soon!',
    swap_unknown_wallet: '⚠️ Unknown wallet type',
    swap_initiated: 'Swap initiated…',
    swap_recorded: '✓ Swap recorded! Sign in wallet to execute.',
    swap_completed: 'Swap completed',
    swap_error: '❌ Error: ',
    swap_execute: 'Swap',
    loading_transactions: 'Loading...',
    ai_connection_error: '⚠️ AI connection error. Check the server.',
    profile_total_balance: 'Total balance',
    profile_recent_activity: 'Recent activity',
    profile_about: 'About',
    no_actions: 'No actions',
    cancel: 'Cancel',
    settings_title: 'Settings',
    s_language: 'Language', s_currency: 'Currency', s_theme: 'Theme',
    s_about: 'About', s_version: 'Version',
    s_general: 'GENERAL', s_display: 'DISPLAY', s_info: 'INFO',
    s_privacy_title: '🔒 Privacy',
    s_privacy_head: '🛡️ We do not collect your data',
    s_privacy1: 'Private key is never sent to the server',
    s_privacy2: 'ORACUL does not store user transaction history',
    s_privacy3: 'Connection via official Phantom SDK',
    s_privacy4: 'Chat data is only used to generate AI responses',
    s_risk_title: '⚠️ Risks',
    s_risk_head: 'Cryptocurrency trading carries high risks',
    s_risk1: 'Meme coins can lose 99% of their value',
    s_risk2: 'AI analysis is informational, not financial advice',
    s_risk3: 'Do your own research (DYOR)',
    s_risk4: 'Only invest what you can afford to lose',
    modal_buy: 'Buy',
    modal_open_dex: 'Open on DexScreener ↗',
    modal_volume: 'Volume 24h', modal_liquidity: 'Liquidity',
    modal_fdv: 'FDV / MCap', modal_txns: 'Txns 24h',
    pick_token: 'Select token',
    pick_search: 'Search…',
    loading: '⏳ Loading…',
    ai_greeting_bold: 'Hello! I am AI Oracle ORACUL.',
    ai_greeting_help: 'I can help you:',
    ai_help1: 'Analyze meme coins and tokens',
    ai_help2: 'Assess risks before buying',
    ai_help3: 'Understand DeFi and Solana',
    ai_help4: 'Find interesting opportunities',
    ai_greeting_end: 'Ask me about any coin or strategy 🚀',
    ai_disclaimer: '⚠️ AI can make mistakes. Always double-check information!',
    terms: 'Terms',
    privacy_policy: 'Privacy Policy',
    ai_footer: 'ORACUL is an AI. By using it, you agree to the',
    ai_footer_terms: 'Terms',
    ai_footer_and: 'and',
    ai_footer_privacy: 'Privacy Policy',
    terms_h1: 'ORACUL Terms of Use',
    terms_p1: '1. ORACUL is a tool for analyzing crypto assets on Solana blockchain.',
    terms_p2: '2. User private keys are never transmitted to the server.',
    terms_p3: '3. User is fully responsible for their decisions to buy/sell tokens.',
    terms_p4: '4. ORACUL provides information for educational purposes.',
    terms_p5: '5. All data is obtained from public blockchain APIs.',
    terms_p6: '6. Use of the service means agreement with these terms.',
    privacy_h1: 'How we protect your data',
    privacy_p1: '1. ORACUL does not store user private keys.',
    privacy_p2: '2. All wallet data is retrieved directly from blockchain via public APIs.',
    privacy_p3: '3. We do not track or store personal information.',
    privacy_p4: '4. Connection is protected with HTTPS encryption.',
    privacy_p5: '5. No personal data is shared with third parties.',
    privacy_p6: '6. All data processing is done locally in your browser.',
    error: 'Error',
    theme_light: 'Light', theme_dark: 'Dark', theme_auto: 'Auto',
    ton_enter_address: 'Enter TON wallet address:\n(format: UQ... or EQ...)',
    confirm_action: 'Confirm action',
    token_singular: 'token',
    token_plural: 'tokens',
  },
  zh: {
    nav_catalog: '市场', nav_swap: '兑换',
    nav_ai: 'AI', nav_settings: '设置', nav_profile: '个人资料',
    nav_portfolio: '投资组合', nav_watchlist: '收藏', nav_referral: '推荐',
    // TON Wallet
    ton_wallet_connected: 'TON钱包已连接',
    ton_wallet_info: '您已通过TON Connect连接。现在可以交换TON为其他代币。',
    balance: '余额',
    wallet_not_connected: '钱包未连接',
    sol_address_required: '输入Solana钱包地址以接收',
    sol_address_invalid: '输入有效的Solana地址',
    swap_route: '路由',
    swap_processing: '处理需要2-5分钟',
    tab_trending: 'Trending', tab_gainers: '涨幅榜', tab_new: '新币', tab_search: '搜索',
    search_placeholder: '代号或地址…', search_btn: '→',
    nothing_found: '未找到结果',
    vol: '成交量',
    swap_title: '代币兑换',
    swap_give: '支出', swap_get: '获得',
    swap_quote_btn: '获取报价',
    swap_platform_fee: '平台费用',
    swap_slippage: '滑点',
    swap_rate: '汇率',
    swap_receive: '您将获得',
    swap_disclaimer_title: '⚠️ 风险与安全',
    swap_risk1: '迷因币极度波动，价格随时可能下跌90%+。',
    swap_risk2: '兑换通过Jupiter去中心化聚合器执行，交易不可逆。',
    swap_risk3: 'ORACUL不存储或传输您的钱包数据，私钥永远不会离开您的设备。',
    swap_risk4: '只投入您能承受全部损失的资金。',
    ai_placeholder: '询问关于代币、风险、策略…',
    connect_wallet: '连接',
    wallet_balance: '余额',
    wallet_tokens: '代币',
    wallet_total: '总价值',
    wallet_disconnect: '断开钱包',
    wallet_my: '我的钱包',
    wallet_no_tokens: '未找到代币',
    wallet_connected: '已连接',
    wallet_choose: '选择钱包',
    wallet_connect_to_see: '连接钱包查看历史',
    wallet_connect_first: '请先连接钱包',
    ton_wallet: 'TON钱包',
    swap_get_quote: '获取报价',
    swap_confirm: '确认交换',
    swap_calculating: '⏳ 计算中…',
    swap_enter_amount: '输入金额',
    swap_loading: '获取报价中…',
    swap_preparing: '准备交易…',
    swap_sign_wallet: '在钱包中签名…',
    swap_done: '完成!',
    swap_view_tx: '查看交易 ↗',
    swap_try_again: '重试',
    swap_between_chains: '⚠️ 链间互换(TON → SOL)需要桥接。即将推出!',
    swap_unknown_wallet: '⚠️ 未知钱包类型',
    swap_initiated: '交易已启动…',
    swap_recorded: '✓ 交易已记录!在钱包中签名以执行。',
    swap_completed: '交易完成',
    swap_error: '❌ 错误: ',
    swap_execute: '交换',
    loading_transactions: '加载中...',
    ai_connection_error: '⚠️ AI连接错误。检查服务器。',
    profile_total_balance: '总余额',
    profile_recent_activity: '最近活动',
    profile_about: '关于',
    no_actions: '无操作',
    cancel: '取消',
    settings_title: '设置',
    s_language: '语言', s_currency: '货币', s_theme: '主题',
    s_about: '关于', s_version: '版本',
    s_general: '基本', s_display: '显示', s_info: '信息',
    s_privacy_title: '🔒 隐私',
    s_privacy_head: '🛡️ 我们不收集您的数据',
    s_privacy1: '私钥从不发送到服务器',
    s_privacy2: 'ORACUL不存储用户交易记录',
    s_privacy3: '通过官方Phantom SDK连接',
    s_privacy4: '聊天数据仅用于生成AI回复',
    s_risk_title: '⚠️ 风险',
    s_risk_head: '加密货币交易风险极高',
    s_risk1: '迷因币可能损失99%的价值',
    s_risk2: 'AI分析仅供参考，不构成投资建议',
    s_risk3: '请自行研究 (DYOR)',
    s_risk4: '只投入您能承受损失的资金',
    modal_buy: '购买',
    modal_open_dex: '在DexScreener查看 ↗',
    modal_volume: '24h成交量', modal_liquidity: '流动性',
    modal_fdv: 'FDV / 市值', modal_txns: '24h交易',
    pick_token: '选择代币',
    pick_search: '搜索…',
    loading: '⏳ 加载中…',
    ai_greeting_bold: '你好！我是AI预言家 ORACUL。',
    ai_greeting_help: '我可以帮你:',
    ai_help1: '分析迷因币和代币',
    ai_help2: '购买前评估风险',
    ai_help3: '了解DeFi和Solana',
    ai_help4: '寻找有趣的机会',
    ai_greeting_end: '问我任何关于代币或策略的问题 🚀',
    ai_disclaimer: '⚠️ 人工智能可能出错。始终要自己仔细检查信息！',
    terms: '条款',
    privacy_policy: '隐私政策',
    ai_footer: 'ORACUL 是一个人工智能。使用它即表示您同意',
    ai_footer_terms: '条款',
    ai_footer_and: '和',
    ai_footer_privacy: '隐私政策',
    terms_h1: 'ORACUL使用条款',
    terms_p1: '1. ORACUL 是分析 Solana 区块链上加密资产的工具。',
    terms_p2: '2. 用户私钥永远不会发送到服务器。',
    terms_p3: '3. 用户对购买/出售代币的决定承担全部责任。',
    terms_p4: '4. ORACUL 提供教育性信息。',
    terms_p5: '5. 所有数据来自公共区块链 API。',
    terms_p6: '6. 使用该服务表示您同意这些条款。',
    privacy_h1: '我们如何保护您的数据',
    privacy_p1: '1. ORACUL 不存储用户私钥。',
    privacy_p2: '2. 所有钱包数据直接从区块链通过公共 API 获取。',
    privacy_p3: '3. 我们不追踪或存储个人信息。',
    privacy_p4: '4. 连接通过 HTTPS 加密保护。',
    privacy_p5: '5. 任何个人数据都不会与第三方共享。',
    privacy_p6: '6. 所有数据处理都在您的浏览器中本地进行。',
    error: '错误',
    theme_light: '浅色', theme_dark: '深色', theme_auto: '自动',
    ton_enter_address: '输入 TON 钱包地址：\n(格式：UQ... 或 EQ...)',
    confirm_action: '确认操作',
    token_singular: '个代币',
    token_plural: '个代币',
  },
  es: {
    nav_catalog: 'Catálogo', nav_swap: 'Swap',
    nav_ai: 'IA', nav_settings: 'Ajustes', nav_profile: 'Perfil',
    nav_portfolio: 'Cartera', nav_watchlist: 'Favoritos', nav_referral: 'Referidos',
    // TON Wallet
    ton_wallet_connected: 'Billetera TON conectada',
    ton_wallet_info: 'Estás conectado a través de TON Connect. Ahora puedes intercambiar TON por otros tokens.',
    balance: 'Saldo',
    wallet_not_connected: 'Billetera no conectada',
    sol_address_required: 'Ingresa la dirección de billetera Solana para recibir',
    sol_address_invalid: 'Ingresa una dirección Solana válida',
    swap_route: 'Ruta',
    swap_processing: 'El procesamiento tomará 2-5 minutos',
    tab_trending: 'Trending', tab_gainers: 'Creciendo', tab_new: 'Nuevas', tab_search: 'Buscar',
    search_placeholder: 'Ticker o dirección…', search_btn: '→',
    nothing_found: 'No encontrado',
    vol: 'Vol',
    swap_title: 'Intercambio de tokens',
    swap_give: 'Pago', swap_get: 'Recibo',
    swap_quote_btn: 'Obtener cotización',
    swap_platform_fee: 'Comisión plataforma',
    swap_slippage: 'Deslizamiento',
    swap_rate: 'Tasa',
    swap_receive: 'Recibirás',
    swap_disclaimer_title: '⚠️ Riesgos y seguridad',
    swap_risk1: 'Las memecoins son extremadamente volátiles. El precio puede caer 90%+ en cualquier momento.',
    swap_risk2: 'El swap se ejecuta a través de Jupiter. Las transacciones son irreversibles.',
    swap_risk3: 'ORACUL no almacena ni transmite datos de tu billetera. La clave privada nunca sale del dispositivo.',
    swap_risk4: 'Solo invierte lo que puedes permitirte perder completamente.',
    ai_placeholder: 'Pregunta sobre monedas, riesgos, estrategia…',
    connect_wallet: 'Conectar',
    wallet_balance: 'Saldo',
    wallet_tokens: 'Tokens',
    wallet_total: 'Valor total',
    wallet_disconnect: 'Desconectar billetera',
    wallet_my: 'Mi billetera',
    wallet_no_tokens: 'No se encontraron tokens',
    wallet_connected: 'conectado',
    wallet_choose: 'Elige billetera',
    wallet_connect_to_see: 'Conecta la billetera para ver el historial',
    wallet_connect_first: 'Conecta la billetera primero',
    ton_wallet: 'Billetera TON',
    swap_get_quote: 'Obtener cotización',
    swap_confirm: 'Confirmar intercambio',
    swap_calculating: '⏳ Calculando…',
    swap_enter_amount: 'Ingresa cantidad',
    swap_loading: 'Obteniendo cotización…',
    swap_preparing: 'Preparando transacción…',
    swap_sign_wallet: 'Firmar en billetera…',
    swap_done: '¡Listo!',
    swap_view_tx: 'Ver transacción ↗',
    swap_try_again: 'Intentar de nuevo',
    swap_between_chains: '⚠️ Intercambio entre cadenas (TON → SOL) requiere puente. ¡Próximamente!',
    swap_unknown_wallet: '⚠️ Tipo de billetera desconocido',
    swap_initiated: 'Transacción iniciada…',
    swap_recorded: '✓ ¡Transacción registrada! Firma en tu billetera para ejecutar.',
    swap_completed: 'Transacción completada',
    swap_error: '❌ Error: ',
    swap_execute: 'Intercambiar',
    loading_transactions: 'Cargando...',
    ai_connection_error: '⚠️ Error de conexión con IA. Verifica el servidor.',
    profile_total_balance: 'Saldo total',
    profile_recent_activity: 'Actividad reciente',
    profile_about: 'Acerca de',
    no_actions: 'Sin acciones',
    cancel: 'Cancelar',
    settings_title: 'Ajustes',
    s_language: 'Idioma', s_currency: 'Moneda', s_theme: 'Tema',
    s_about: 'Acerca de', s_version: 'Versión',
    s_general: 'GENERAL', s_display: 'PANTALLA', s_info: 'INFO',
    s_privacy_title: '🔒 Privacidad',
    s_privacy_head: '🛡️ No recopilamos tus datos',
    s_privacy1: 'La clave privada nunca se envía al servidor',
    s_privacy2: 'ORACUL no almacena el historial de transacciones',
    s_privacy3: 'Conexión a través del SDK oficial de Phantom',
    s_privacy4: 'Los datos del chat solo se usan para generar respuestas de IA',
    s_risk_title: '⚠️ Riesgos',
    s_risk_head: 'El trading de criptomonedas conlleva altos riesgos',
    s_risk1: 'Las memecoins pueden perder el 99% de su valor',
    s_risk2: 'El análisis de IA es informativo, no consejo financiero',
    s_risk3: 'Haz tu propia investigación (DYOR)',
    s_risk4: 'Solo invierte lo que puedes permitirte perder',
    modal_buy: 'Comprar',
    modal_open_dex: 'Ver en DexScreener ↗',
    modal_volume: 'Volumen 24h', modal_liquidity: 'Liquidez',
    modal_fdv: 'FDV / Cap', modal_txns: 'Txns 24h',
    pick_token: 'Seleccionar token',
    pick_search: 'Buscar…',
    loading: '⏳ Cargando…',
    ai_greeting_bold: '¡Hola! Soy el Oráculo IA de ORACUL.',
    ai_greeting_help: 'Puedo ayudarte a:',
    ai_help1: 'Analizar memecoins y tokens',
    ai_help2: 'Evaluar riesgos antes de comprar',
    ai_help3: 'Entender DeFi y Solana',
    ai_help4: 'Encontrar oportunidades interesantes',
    ai_greeting_end: 'Pregúntame sobre cualquier moneda o estrategia 🚀',
    ai_disclaimer: '⚠️ La IA puede cometer errores. ¡Siempre verifica la información!',
    terms: 'Términos',
    privacy_policy: 'Política de privacidad',
    ai_footer: 'ORACUL es una IA. Al usarla, aceptas los',
    ai_footer_terms: 'Términos',
    ai_footer_and: 'y la',
    ai_footer_privacy: 'Política de privacidad',
    terms_h1: 'Términos de uso de ORACUL',
    terms_p1: '1. ORACUL es una herramienta para analizar activos criptográficos en blockchain Solana.',
    terms_p2: '2. Las claves privadas del usuario nunca se transmiten al servidor.',
    terms_p3: '3. El usuario es totalmente responsable de sus decisiones de compra/venta de tokens.',
    terms_p4: '4. ORACUL proporciona información con fines educativos.',
    terms_p5: '5. Todos los datos se obtienen de APIs públicas de blockchain.',
    terms_p6: '6. El uso del servicio implica aceptación de estos términos.',
    privacy_h1: 'Cómo protegemos tus datos',
    privacy_p1: '1. ORACUL no almacena claves privadas del usuario.',
    privacy_p2: '2. Todos los datos de billetera se recuperan directamente del blockchain a través de APIs públicas.',
    privacy_p3: '3. No rastreamos ni almacenamos información personal.',
    privacy_p4: '4. La conexión está protegida con cifrado HTTPS.',
    privacy_p5: '5. Ningún dato personal se comparte con terceros.',
    privacy_p6: '6. Todo el procesamiento de datos se realiza localmente en tu navegador.',
    error: 'Error',
    theme_light: 'Claro', theme_dark: 'Oscuro', theme_auto: 'Auto',
    ton_enter_address: 'Ingresa la dirección de tu billetera TON:\n(formato: UQ... o EQ...)',
    confirm_action: 'Confirmar acción',
    token_singular: 'token',
    token_plural: 'tokens',
  },
};

// ─── ВАЛЮТЫ ───────────────────────────────────────────────────────────────────
export const CURRENCIES = [
  { code: 'USD', symbol: '$',  label: 'US Dollar',          flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',  label: 'Euro',               flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',  label: 'British Pound',      flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥',  label: 'Japanese Yen',       flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥',  label: 'Chinese Yuan',       flag: '🇨🇳' },
  { code: 'RUB', symbol: '₽',  label: 'Russian Ruble',      flag: '🇷🇺' },
  { code: 'UAH', symbol: '₴',  label: 'Ukrainian Hryvnia',  flag: '🇺🇦' },
  { code: 'KZT', symbol: '₸',  label: 'Kazakhstani Tenge',  flag: '🇰🇿' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real',     flag: '🇧🇷' },
  { code: 'INR', symbol: '₹',  label: 'Indian Rupee',       flag: '🇮🇳' },
];

export const LANGUAGES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文',     flag: '🇨🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

// Курсы к USD
const FX = { USD:1, EUR:0.92, GBP:0.79, JPY:149, CNY:7.24, RUB:91, UAH:37, KZT:450, BRL:4.95, INR:83 };

// ─── СОСТОЯНИЕ ────────────────────────────────────────────────────────────────
const DEFAULTS = { lang: 'ru', currency: 'USD', theme: 'light' };

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('oracul_settings') || '{}') }; }
  catch { return { ...DEFAULTS }; }
}
function save(s) { localStorage.setItem('oracul_settings', JSON.stringify(s)); }

export let settings = load();

// ─── ГЕТТЕРЫ ──────────────────────────────────────────────────────────────────
export function t(key) {
  return (TRANSLATIONS[settings.lang] || TRANSLATIONS.ru)[key] || TRANSLATIONS.ru[key] || key;
}

export function getCurrency() {
  return CURRENCIES.find(c => c.code === settings.currency) || CURRENCIES[0];
}

export function convertPrice(usdPrice) {
  if (usdPrice == null) return null;
  const rate = FX[settings.currency] || 1;
  return usdPrice * rate;
}

export function fmtPrice(usdValue) {
  const cur = getCurrency();
  const v   = convertPrice(usdValue);
  if (v == null) return '—';
  const sym = cur.symbol;
  if (v >= 1e9)     return sym + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6)     return sym + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3)     return sym + (v / 1e3).toFixed(1) + 'K';
  if (v < 0.000001) return sym + v.toExponential(2);
  if (v < 0.001)    return sym + v.toFixed(7);
  if (v < 0.01)     return sym + v.toFixed(6);
  if (v < 1)        return sym + v.toFixed(4);
  return sym + v.toFixed(2);
}

// ─── ТЕМА ─────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'auto' && prefersDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

// ─── ПЕРЕВОДЫ НА СТРАНИЦЕ ─────────────────────────────────────────────────────
export function applyTranslations() {
  // 1. Обновляем все [data-i18n] элементы
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val) el.textContent = val;
  });

  // 2. Обновляем placeholder у [data-i18n-ph]
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.dataset.i18nPh;
    const val = t(key);
    if (val) el.placeholder = val;
  });

  // 3. Обновляем язык документа
  document.documentElement.lang = settings.lang;
}

// ─── ГЛОБАЛЬНЫЙ ПЕРЕРЕНДЕР ────────────────────────────────────────────────────
// Колбэки которые можно зарегистрировать снаружи
const _onChangeCbs = new Set();
export function onSettingsChange(cb) { _onChangeCbs.add(cb); }

// ─── ИЗМЕНИТЬ НАСТРОЙКУ ───────────────────────────────────────────────────────
export function setSetting(key, value) {
  settings[key] = value;
  save(settings);

  if (key === 'theme') {
    applyTheme(value);
  }

  if (key === 'lang') {
    applyTranslations();
  }

  // Вызываем все зарегистрированные колбэки (каталог, свап и т.д.)
  _onChangeCbs.forEach(cb => {
    try { cb(key, value); } catch {}
  });
}

// ─── СТРАНИЦА НАСТРОЕК ────────────────────────────────────────────────────────
export function renderSettings() {
  const el = document.getElementById('settingsContent');
  if (!el) return;

  const cur  = getCurrency();
  const lang = LANGUAGES.find(l => l.code === settings.lang) || LANGUAGES[0];
  const themeLabel = {
    light: t('theme_light'),
    dark:  t('theme_dark'),
    auto:  t('theme_auto'),
  };

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;padding:16px;background:var(--surface);border-radius:var(--radius);border:1px solid var(--border);margin-bottom:20px">
      <div style="width:52px;height:52px;border-radius:50%;flex-shrink:0">
        <img src="logo-new.svg" style="width:52px;height:52px;border-radius:50%" />
      </div>
      <div>
        <div style="font-size:17px;font-weight:700">ORACUL</div>
        <div style="font-size:13px;color:var(--ink-3)">Crypto · Meme · AI</div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${t('s_general')}</div>
      <div class="settings-list">
        <div class="settings-row" id="sRowLang">
          <div class="settings-row-left">
            <div class="settings-icon" style="background:#EFF6FF">🌐</div>
            <span class="settings-label">${t('s_language')}</span>
          </div>
          <div class="settings-value">
            <span>${lang.flag} ${lang.label}</span>
            <span class="settings-chevron">›</span>
          </div>
        </div>
        <div class="settings-row" id="sRowCurrency">
          <div class="settings-row-left">
            <div class="settings-icon" style="background:#F0FDF4">${cur.flag}</div>
            <span class="settings-label">${t('s_currency')}</span>
          </div>
          <div class="settings-value">
            <span>${cur.symbol} ${cur.code}</span>
            <span class="settings-chevron">›</span>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${t('s_display')}</div>
      <div class="settings-list">
        <div class="settings-row" id="sRowTheme">
          <div class="settings-row-left">
            <div class="settings-icon" style="background:#FFF7ED">🎨</div>
            <span class="settings-label">${t('s_theme')}</span>
          </div>
          <div class="settings-value">
            <span>${themeLabel[settings.theme] || themeLabel.light}</span>
            <span class="settings-chevron">›</span>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${t('s_info')}</div>
      <div class="settings-list">
        <div class="settings-row" style="cursor:default">
          <div class="settings-row-left">
            <div class="settings-icon" style="background:#FFF0E8">
              <img src="logo-new.svg" style="width:20px;height:20px;border-radius:50%" />
            </div>
            <span class="settings-label">${t('s_about')}</span>
          </div>
          <div class="settings-value">ORACUL v1.0</div>
        </div>
        <div class="settings-row" style="cursor:default">
          <div class="settings-row-left">
            <div class="settings-icon" style="background:#F5F5F5">⚡</div>
            <span class="settings-label">${t('s_version')}</span>
          </div>
          <div class="settings-value">1.0.0</div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${t('s_privacy_title')}</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;font-size:13px;color:var(--ink-2);line-height:1.6">
        <div style="font-weight:600;margin-bottom:6px;color:var(--ink)">${t('s_privacy_head')}</div>
        <ul style="padding-left:16px;margin:0;display:flex;flex-direction:column;gap:4px">
          <li>${t('s_privacy1')}</li>
          <li>${t('s_privacy2')}</li>
          <li>${t('s_privacy3')}</li>
          <li>${t('s_privacy4')}</li>
        </ul>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${t('s_risk_title')}</div>
      <div style="background:#FFF8F0;border:1px solid #FFD4A8;border-radius:var(--radius);padding:14px 16px;font-size:13px;color:#7A3B00;line-height:1.6">
        <div style="font-weight:600;margin-bottom:6px">${t('s_risk_head')}</div>
        <ul style="padding-left:16px;margin:0;display:flex;flex-direction:column;gap:4px">
          <li>${t('s_risk1')}</li>
          <li>${t('s_risk2')}</li>
          <li>${t('s_risk3')}</li>
          <li>${t('s_risk4')}</li>
        </ul>
      </div>
    </div>

    <!-- Cooldowns & Protection -->
    <div class="settings-section">
      <div class="settings-section-title">🛡️ Защита от FOMO</div>
      <button 
        onclick="window.showCooldownSettings()"
        style="
          width:100%;
          padding:14px;
          background:var(--surface);
          border:1.5px solid var(--border);
          border-radius:var(--radius);
          font-size:13px;
          font-weight:600;
          cursor:pointer;
          transition:all 0.2s;
        "
        onmouseover="this.style.borderColor='var(--orange)'"
        onmouseout="this.style.borderColor='var(--border)'"
      >
        ⚙️ Настроить лимиты и cooldown-ы
      </button>
      <div style="font-size:12px;color:var(--ink-3);margin-top:8px">
        Установи ежедневные лимиты потерь и защиту от импульсивных сделок
      </div>
    </div>
  `;

  el.querySelector('#sRowLang').addEventListener('click', () => showPicker('lang'));
  el.querySelector('#sRowCurrency').addEventListener('click', () => showPicker('currency'));
  el.querySelector('#sRowTheme').addEventListener('click', () => showPicker('theme'));
}

// ─── PICKER ───────────────────────────────────────────────────────────────────
function showPicker(type) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  document.getElementById('app').appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  let items = [], title = '';

  if (type === 'lang') {
    title = t('s_language');
    items = LANGUAGES.map(l => ({
      key: l.code, label: l.label, sub: '', icon: l.flag,
      active: settings.lang === l.code,
    }));
  } else if (type === 'currency') {
    title = t('s_currency');
    items = CURRENCIES.map(c => ({
      key: c.code, label: `${c.flag}  ${c.code}  ${c.symbol}`, sub: c.label, icon: '',
      active: settings.currency === c.code,
    }));
  } else if (type === 'theme') {
    title = t('s_theme');
    items = [
      { code: 'light', icon: '☀️', label: t('theme_light') },
      { code: 'dark',  icon: '🌙', label: t('theme_dark') },
      { code: 'auto',  icon: '⚙️', label: t('theme_auto') },
    ].map(th => ({
      key: th.code, label: th.label, sub: '', icon: th.icon,
      active: settings.theme === th.code,
    }));
  }

  overlay.innerHTML = `
    <div class="modal-card" style="max-height:75dvh">
      <button class="modal-close" id="pickerClose">✕</button>
      <h3 style="font-size:18px;font-weight:700;margin-bottom:14px">${title}</h3>
      <div class="option-list">
        ${items.map(item => `
          <div class="option-item ${item.active ? 'active' : ''}" data-key="${item.key}">
            <div>
              <div class="option-item-label">${item.icon ? item.icon + '  ' : ''}${item.label}</div>
              ${item.sub ? `<div class="option-item-sub">${item.sub}</div>` : ''}
            </div>
            <div class="option-check"></div>
          </div>`).join('')}
      </div>
    </div>`;

  const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 250); };
  overlay.querySelector('#pickerClose').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelectorAll('.option-item').forEach(item => {
    item.addEventListener('click', () => {
      setSetting(type, item.dataset.key);
      close();
      renderSettings();
    });
  });
}

// ─── ИНИЦИАЛИЗАЦИЯ ────────────────────────────────────────────────────────────
export function initSettings() {
  applyTheme(settings.theme);
  applyTranslations();
}


// Показать настройки cooldown-ов
window.showCooldownSettings = async () => {
  const { renderLimitSettings } = await import('./cooldown.js');
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.style.zIndex = '10000';
  modal.innerHTML = `
    <div class="modal-card" style="max-height:80vh;overflow-y:auto">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="font-size:18px;font-weight:700;margin-bottom:14px">🛡️ Защита от FOMO</h2>
      ${renderLimitSettings()}
    </div>
  `;
  document.body.appendChild(modal);
};
