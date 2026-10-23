import type { Currency } from './types';

export const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
export const GOOGLE_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

export interface Service {
  id: string;
  name: string;
  color: string;
  /** usual billing currency for Ukrainian cards — only a default, user can change it */
  currency: Currency;
  /** patterns matched against bank statement descriptions */
  match?: RegExp;
  /** charges from one merchant can be several different subscriptions (App Store, Google Play) */
  aggregator?: boolean;
  cancel: {
    url?: string;
    steps: string[];
  };
}

const viaStores = 'Оформлювали в застосунку на телефоні? Тоді скасування тільки в магазині застосунків, кнопка нижче';

/**
 * Order matters for matching: specific services first, store aggregators last.
 */
export const SERVICES: Service[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    color: '#E50914',
    currency: 'USD',
    match: /netflix/i,
    cancel: {
      url: 'https://www.netflix.com/cancelplan',
      steps: [
        'Відкрийте сторінку скасування і увійдіть у свій акаунт',
        'Натисніть «Скасувати підписку»',
        'Доступ залишиться до кінця оплаченого місяця',
      ],
    },
  },
  {
    id: 'spotify',
    name: 'Spotify',
    color: '#1DB954',
    currency: 'UAH',
    match: /spotify/i,
    cancel: {
      url: 'https://www.spotify.com/account/subscription/',
      steps: [
        'Відкрийте акаунт Spotify у браузері. У застосунку скасувати не можна',
        'Оберіть «Керувати планом», потім «Скасувати Premium»',
        'Після кінця періоду акаунт стане безкоштовним',
      ],
    },
  },
  {
    id: 'youtube',
    name: 'YouTube Premium',
    color: '#FF0033',
    currency: 'UAH',
    match: /youtube/i,
    cancel: {
      url: 'https://www.youtube.com/paid_memberships',
      steps: [
        'Відкрийте «Платні підписки» в YouTube',
        'Оберіть Premium і натисніть «Деактивувати»',
        viaStores,
      ],
    },
  },
  {
    id: 'googleone',
    name: 'Google One',
    color: '#4285F4',
    currency: 'UAH',
    match: /google\s*\*?\s*one/i,
    cancel: {
      url: 'https://one.google.com/settings',
      steps: [
        'Відкрийте налаштування Google One',
        'Натисніть «Скасувати підписку»',
        'Якщо оплачували в застосунку на телефоні, скасуйте в магазині застосунків',
      ],
    },
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT Plus',
    color: '#10A37F',
    currency: 'USD',
    match: /openai|chatgpt/i,
    cancel: {
      url: 'https://chatgpt.com/#settings/Subscription',
      steps: [
        'Відкрийте ChatGPT у браузері: Налаштування → Акаунт',
        'Натисніть «Керувати», потім «Скасувати підписку»',
        viaStores,
      ],
    },
  },
  {
    id: 'claude',
    name: 'Claude Pro',
    color: '#C96442',
    currency: 'USD',
    match: /anthropic|claude\.ai/i,
    cancel: {
      url: 'https://claude.ai/settings/billing',
      steps: [
        'Відкрийте claude.ai → Налаштування → Billing',
        'Натисніть «Cancel» біля вашого плану',
        viaStores,
      ],
    },
  },
  {
    id: 'megogo',
    name: 'MEGOGO',
    color: '#7B3FE4',
    currency: 'UAH',
    match: /megogo/i,
    cancel: {
      url: 'https://megogo.net',
      steps: [
        'Увійдіть на megogo.net',
        'Відкрийте профіль, розділ «Підписки»',
        'Вимкніть автопродовження',
      ],
    },
  },
  {
    id: 'sweettv',
    name: 'SWEET.TV',
    color: '#E6236B',
    currency: 'UAH',
    match: /sweet\.?\s?tv/i,
    cancel: {
      url: 'https://sweet.tv',
      steps: [
        'Увійдіть на sweet.tv',
        'Профіль → «Мої підписки»',
        'Вимкніть автоматичне продовження',
      ],
    },
  },
  {
    id: 'kyivstartv',
    name: 'Київстар ТБ',
    color: '#0A5BD3',
    currency: 'UAH',
    match: /kyivstar\s*tv|київстар\s*тб|kyivstar\s*тб/i,
    cancel: {
      url: 'https://tv.kyivstar.ua',
      steps: [
        'Відкрийте Київстар ТБ у застосунку або на сайті',
        'Профіль → «Підписки»',
        'Вимкніть автопродовження потрібного пакета',
      ],
    },
  },
  {
    id: 'xbox',
    name: 'Xbox Game Pass',
    color: '#107C10',
    currency: 'UAH',
    match: /xbox|game\s?pass/i,
    cancel: {
      url: 'https://account.microsoft.com/services',
      steps: [
        'Відкрийте сторінку служб Microsoft',
        'Біля Game Pass натисніть «Керування», потім «Скасувати підписку»',
        'Підтвердіть скасування',
      ],
    },
  },
  {
    id: 'microsoft365',
    name: 'Microsoft 365',
    color: '#D83B01',
    currency: 'UAH',
    match: /microsoft|msft/i,
    cancel: {
      url: 'https://account.microsoft.com/services',
      steps: [
        'Відкрийте сторінку служб Microsoft',
        'Біля Microsoft 365 натисніть «Керування», потім «Скасувати підписку»',
        'Підтвердіть скасування',
      ],
    },
  },
  {
    id: 'psplus',
    name: 'PlayStation Plus',
    color: '#0070D1',
    currency: 'UAH',
    match: /playstation|sony\s?interactive/i,
    cancel: {
      steps: [
        'На консолі: Налаштування → Користувачі та облікові записи → Обліковий запис',
        'Оплата й підписки → Підписки',
        'Оберіть PlayStation Plus і вимкніть автоматичне поновлення',
      ],
    },
  },
  {
    id: 'duolingo',
    name: 'Duolingo Super',
    color: '#58CC02',
    currency: 'USD',
    match: /duolingo/i,
    cancel: {
      url: 'https://www.duolingo.com/settings/subscription',
      steps: [
        viaStores,
        'Якщо оплачували на сайті: Налаштування → Підписка → «Скасувати»',
      ],
    },
  },
  {
    id: 'telegram',
    name: 'Telegram Premium',
    color: '#229ED9',
    currency: 'USD',
    match: /telegram/i,
    cancel: {
      steps: [
        viaStores,
        'Якщо оплачували через бота @PremiumBot, відкрийте його і перевірте статус підписки',
      ],
    },
  },
  {
    id: 'discord',
    name: 'Discord Nitro',
    color: '#5865F2',
    currency: 'USD',
    match: /discord/i,
    cancel: {
      url: 'https://discord.com/app',
      steps: [
        'Discord → Налаштування користувача → Підписки',
        'Біля Nitro натисніть «Скасувати»',
        viaStores,
      ],
    },
  },
  {
    id: 'canva',
    name: 'Canva Pro',
    color: '#00A3B4',
    currency: 'USD',
    match: /canva/i,
    cancel: {
      url: 'https://www.canva.com/settings/billing-and-plans',
      steps: [
        'Canva → Налаштування → Оплата й плани',
        'Оберіть план і натисніть «Скасувати підписку»',
      ],
    },
  },
  {
    id: 'adobe',
    name: 'Adobe Creative Cloud',
    color: '#E1251B',
    currency: 'USD',
    match: /adobe/i,
    cancel: {
      url: 'https://account.adobe.com/plans',
      steps: [
        'Відкрийте «Плани» в акаунті Adobe',
        '«Керувати планом», потім «Скасувати план»',
        'Річний план з помісячною оплатою може мати штраф за дострокове скасування. Adobe покаже суму перед підтвердженням',
      ],
    },
  },
  {
    id: 'notion',
    name: 'Notion',
    color: '#6B6A66',
    currency: 'USD',
    match: /notion/i,
    cancel: {
      url: 'https://www.notion.so',
      steps: ['Notion → Settings → Billing', 'Змініть план на Free'],
    },
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    color: '#3B3B6D',
    currency: 'USD',
    match: /midjourney/i,
    cancel: {
      url: 'https://www.midjourney.com/account',
      steps: ['Відкрийте акаунт Midjourney', 'Натисніть «Cancel plan» і підтвердіть'],
    },
  },
  {
    id: 'icloud',
    name: 'iCloud+',
    color: '#3693F3',
    currency: 'USD',
    cancel: {
      url: APPLE_SUBSCRIPTIONS_URL,
      steps: [
        'На iPhone: Параметри → ваше ім’я → iCloud',
        'Керувати сховищем → Змінити план',
        'Оберіть безкоштовні 5 ГБ',
      ],
    },
  },
  {
    id: 'apple',
    name: 'Apple',
    color: '#6E6E73',
    currency: 'USD',
    aggregator: true,
    match: /apple|itunes/i,
    cancel: {
      url: APPLE_SUBSCRIPTIONS_URL,
      steps: [
        'На iPhone: Параметри → ваше ім’я → Підписки',
        'Оберіть підписку з такою ж сумою',
        'Натисніть «Скасувати підписку»',
      ],
    },
  },
  {
    id: 'googleplay',
    name: 'Google Play',
    color: '#01875F',
    currency: 'UAH',
    aggregator: true,
    match: /google/i,
    cancel: {
      url: GOOGLE_SUBSCRIPTIONS_URL,
      steps: [
        'Відкрийте Google Play → профіль → Платежі й підписки → Підписки',
        'Оберіть підписку з такою ж сумою',
        'Натисніть «Скасувати підписку»',
      ],
    },
  },
];

export const GENERIC_CANCEL_STEPS = [
  'Знайдіть у сервісі розділ «Акаунт», «Оплата» або «Підписка»',
  'Вимкніть автопродовження або скасуйте план',
  'Якщо платили в застосунку на телефоні, скасувати можна тільки в магазині застосунків',
];

/** Services shown first on the "add" screen. */
export const POPULAR_IDS = [
  'netflix', 'spotify', 'youtube', 'megogo', 'sweettv', 'kyivstartv',
  'chatgpt', 'icloud', 'googleone', 'apple', 'googleplay', 'xbox',
  'psplus', 'duolingo', 'telegram', 'claude', 'microsoft365', 'canva',
  'discord', 'adobe', 'notion', 'midjourney',
];

export function findService(id?: string): Service | undefined {
  if (!id) return undefined;
  return SERVICES.find((s) => s.id === id);
}

export function matchService(description: string): Service | undefined {
  return SERVICES.find((s) => s.match?.test(description));
}

const CUSTOM_COLORS = ['#2F4BFF', '#8B5CF6', '#0EA5A4', '#F97316', '#DB2777', '#4D7C0F', '#0369A1', '#B45309'];

export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CUSTOM_COLORS[h % CUSTOM_COLORS.length];
}

/** Two letters for the round badge: "Netflix" → "N", "YouTube Premium" → "YP" */
export function initials(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, ' ')
    .replace(/[.,*+_()\-–—/\\&!?"'«»]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
