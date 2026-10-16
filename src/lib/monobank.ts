import type { StatementItem } from './detect';

const BASE = 'https://api.monobank.ua';

/** Where the user scans a QR in the monobank app to get a personal read-only token. */
export const TOKEN_URL = 'https://api.monobank.ua/';

/** monobank allows one statement request per 60 seconds and at most 31 days + 1 hour per request. */
export const REQUEST_GAP_MS = 61_000;
const PERIOD_SECONDS = 31 * 24 * 3600;

export class MonobankError extends Error {
  constructor(
    public kind: 'token' | 'rate' | 'network' | 'unknown',
    message: string,
  ) {
    super(message);
  }
}

export async function fetchStatement(
  token: string,
  from: number,
  to: number,
  account = '0',
): Promise<StatementItem[]> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/personal/statement/${account}/${from}/${to}`, {
      headers: { 'X-Token': token.trim() },
    });
  } catch {
    throw new MonobankError('network', 'Немає зʼєднання з monobank. Перевірте інтернет і спробуйте ще раз.');
  }
  if (res.status === 401 || res.status === 403) {
    throw new MonobankError('token', 'Токен не підходить. Створіть новий на api.monobank.ua і вставте його ще раз.');
  }
  if (res.status === 429) {
    throw new MonobankError('rate', 'monobank просить зачекати хвилину між запитами. Спробуйте трохи згодом.');
  }
  if (!res.ok) {
    throw new MonobankError('unknown', `monobank відповів помилкою ${res.status}. Спробуйте пізніше.`);
  }
  return (await res.json()) as StatementItem[];
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new Error('aborted'));
    });
  });
}

/**
 * Downloads `periods` × 31 days of statement, newest first,
 * respecting the one-request-per-minute limit.
 */
export async function scanStatement(
  token: string,
  periods: number,
  onPeriod: (index: number, items: StatementItem[], from: Date) => void,
  signal?: AbortSignal,
): Promise<StatementItem[]> {
  const all: StatementItem[] = [];
  let to = Math.floor(Date.now() / 1000);
  for (let i = 0; i < periods; i++) {
    if (i > 0) await sleep(REQUEST_GAP_MS, signal);
    const from = to - PERIOD_SECONDS;
    const items = await fetchStatement(token, from, to);
    all.push(...items);
    onPeriod(i, items, new Date(from * 1000));
    to = from - 1;
  }
  return all;
}
