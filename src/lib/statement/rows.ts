import type { StatementItem } from '../detect';
import type { Cell, Rows } from './csv';

/**
 * Turns a table from any bank's statement into operations.
 * Banks name columns differently ("Опис операції", "Деталі операції", "Призначення платежу"…),
 * so columns are recognised by keywords in the header row.
 */

const norm = (c: Cell) =>
  String(c ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const RE = {
  date: /дата|date/,
  dateMain: /операц|транзакц|час|время|time|transaction/,
  time: /^(час|время|time)$/,
  desc: /деталі|детали|опис|описание|призначення|назначение|description|details|merchant|контрагент|одержувач|отримувач|получатель|торгов/,
  mcc: /\bmcc\b/,
  amount: /сума|сумма|amount|sum\b/,
  notAmount: /коміс|комис|кешбек|кэшбэк|cashback|залишок|остаток|balance|курс|rate/,
  cardSide: /карт|рахун|счет|счёт|грн|uah|card|account/,
  opSide: /операц|транзакц|transaction|оригінал|original/,
  debit: /дебет|debit|витрат|расход|списан|outflow|withdraw/,
  credit: /кредит|credit|надходж|поступлен|приход|зарахув|inflow|deposit/,
  currency: /валюта|currency/,
};

interface Columns {
  date: number;
  time: number;
  desc: number;
  mcc: number;
  amount: number;
  opAmount: number;
  opCurrency: number;
  cardCurrency: number;
  debit: number;
  credit: number;
}

function pick(cells: string[], test: (c: string, i: number) => boolean): number {
  return cells.findIndex((c, i) => c !== '' && test(c, i));
}

function mapColumns(cells: string[]): Columns | null {
  const dates = cells.map((c, i) => (RE.date.test(c) ? i : -1)).filter((i) => i >= 0);
  if (!dates.length) return null;
  const date = dates.find((i) => RE.dateMain.test(cells[i])) ?? dates[0];

  const amounts = cells.map((c, i) => (RE.amount.test(c) && !RE.notAmount.test(c) ? i : -1)).filter((i) => i >= 0);
  const debit = pick(cells, (c) => RE.debit.test(c) && !RE.date.test(c));
  const credit = pick(cells, (c) => RE.credit.test(c) && !RE.date.test(c) && !RE.notAmount.test(c));
  if (!amounts.length && debit < 0) return null;

  const opAmount = amounts.find((i) => RE.opSide.test(cells[i])) ?? -1;
  const amount =
    amounts.find((i) => RE.cardSide.test(cells[i]) && i !== opAmount) ??
    amounts.find((i) => i !== opAmount) ??
    amounts[0] ??
    -1;

  const currencies = cells.map((c, i) => (RE.currency.test(c) && !RE.amount.test(c) ? i : -1)).filter((i) => i >= 0);
  const opCurrency = currencies.find((i) => RE.opSide.test(cells[i])) ?? (currencies.length === 1 ? currencies[0] : -1);
  const cardCurrency = currencies.find((i) => RE.cardSide.test(cells[i]) && i !== opCurrency) ?? -1;

  let desc = pick(cells, (c) => RE.desc.test(c) && !RE.amount.test(c) && !/категор|category/.test(c));
  if (desc < 0) desc = pick(cells, (c) => /категор|category/.test(c));

  return {
    date,
    time: pick(cells, (c) => RE.time.test(c)),
    desc,
    mcc: pick(cells, (c) => RE.mcc.test(c)),
    amount,
    opAmount,
    opCurrency,
    cardCurrency,
    debit: amounts.length && amount >= 0 ? -1 : debit,
    credit: amounts.length && amount >= 0 ? -1 : credit,
  };
}

/** "-1 234,56 грн", "(199.00)", "1,234.56" → number */
export function parseNumber(cell: Cell): number | null {
  if (cell === null || cell === '') return null;
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null;
  let s = cell.replace(/[\s  ']/g, '');
  const negative = /^[-−–]/.test(s) || /^\(.*\)$/.test(s) || /-$/.test(s);
  s = s.replace(/[^0-9.,]/g, '');
  if (!s) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? '.' : ',';
    s = s.split(decimal === '.' ? ',' : '.').join('');
    s = s.replace(',', '.');
  } else s = s.replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** Unix seconds from "16.10.2026 12:34", "2026-10-16T12:34", or an Excel serial date. */
export function parseDate(cell: Cell, timeCell: Cell = null): number | null {
  let y: number, mo: number, d: number;
  let h = 12;
  let mi = 0;
  if (typeof cell === 'number') {
    if (cell < 20000 || cell > 80000) return null;
    const ms = Math.round((cell - 25569) * 86400 * 1000);
    const t = new Date(ms);
    y = t.getUTCFullYear();
    mo = t.getUTCMonth() + 1;
    d = t.getUTCDate();
    if (cell % 1) {
      h = t.getUTCHours();
      mi = t.getUTCMinutes();
    }
  } else {
    const s = String(cell ?? '').trim();
    let m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2}))?/.exec(s);
    if (m) {
      d = Number(m[1]);
      mo = Number(m[2]);
      y = Number(m[3]);
      if (y < 100) y += 2000;
    } else {
      m = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(s);
      if (!m) return null;
      y = Number(m[1]);
      mo = Number(m[2]);
      d = Number(m[3]);
    }
    if (m[4] !== undefined) {
      h = Number(m[4]);
      mi = Number(m[5]);
    }
  }
  if (timeCell !== null && timeCell !== '') {
    if (typeof timeCell === 'number' && timeCell >= 0 && timeCell < 1) {
      const total = Math.round(timeCell * 1440);
      h = Math.floor(total / 60);
      mi = total % 60;
    } else {
      const t = /(\d{1,2}):(\d{2})/.exec(String(timeCell));
      if (t) {
        h = Number(t[1]);
        mi = Number(t[2]);
      }
    }
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return Math.floor(new Date(y, mo - 1, d, h, mi).getTime() / 1000);
}

export function parseCurrency(cell: Cell): number | null {
  const s = norm(cell);
  if (!s) return null;
  if (/uah|грн|₴|980/.test(s)) return 980;
  if (/usd|\$|дол|840/.test(s)) return 840;
  if (/eur|€|євро|евро|978/.test(s)) return 978;
  return null;
}

export interface ParsedRows {
  items: StatementItem[];
  /** header row was found */
  recognised: boolean;
}

export function rowsToStatement(rows: Rows): ParsedRows {
  let header = -1;
  let cols: Columns | null = null;
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const c = mapColumns(rows[i].map(norm));
    if (c) {
      header = i;
      cols = c;
      break;
    }
  }
  if (!cols) return { items: [], recognised: false };

  const items: StatementItem[] = [];
  const get = (row: Cell[], i: number): Cell => (i >= 0 ? (row[i] ?? null) : null);
  for (let r = header + 1; r < rows.length; r++) {
    const row = rows[r];
    const time = parseDate(get(row, cols.date), get(row, cols.time));
    if (time === null) continue;
    let amount: number | null;
    if (cols.amount >= 0) amount = parseNumber(get(row, cols.amount));
    else {
      const debit = parseNumber(get(row, cols.debit));
      const credit = parseNumber(get(row, cols.credit));
      amount = debit ? -Math.abs(debit) : credit ? Math.abs(credit) : null;
    }
    if (amount === null || amount === 0) continue;
    let op = parseNumber(get(row, cols.opAmount)) ?? amount;
    op = Math.sign(amount) * Math.abs(op);
    const desc = String(get(row, cols.desc) ?? '').trim();
    items.push({
      id: `f${r}`,
      time,
      description: desc,
      mcc: Number(parseNumber(get(row, cols.mcc)) ?? 0),
      amount: Math.round(amount * 100),
      operationAmount: Math.round(op * 100),
      currencyCode: parseCurrency(get(row, cols.opCurrency)) ?? parseCurrency(get(row, cols.cardCurrency)) ?? 980,
    });
  }

  // Some banks list spending as positive numbers. If nothing is negative, treat every row as spending.
  if (cols.amount >= 0 && items.length && !items.some((i) => i.amount < 0)) {
    for (const it of items) {
      it.amount = -it.amount;
      it.operationAmount = -Math.abs(it.operationAmount);
    }
  }
  return { items, recognised: true };
}
