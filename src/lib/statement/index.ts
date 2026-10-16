import type { StatementItem } from '../detect';
import { parseCsv, type Rows } from './csv';
import { decodeText } from './decode';
import { parseMarkupTable } from './markup';
import { rowsToStatement } from './rows';
import { isOleFile, parseXls } from './xls';
import { parseXlsx } from './xlsx';

export class StatementFileError extends Error {}

export type StatementFormat = 'xlsx' | 'xls' | 'html' | 'csv';

/**
 * Reads a statement file exported from any bank app: Excel (new and old), CSV,
 * or the HTML table some banks save with an .xls extension.
 */
export function readStatement(bytes: Uint8Array): { items: StatementItem[]; format: StatementFormat } {
  if (bytes.length < 8) throw new StatementFileError('Файл порожній. Збережіть виписку ще раз.');

  const head = String.fromCharCode(...bytes.subarray(0, 5));
  if (head === '%PDF-') {
    throw new StatementFileError(
      'Це PDF. З нього таблицю не дістати. Збережіть виписку у форматі Excel або CSV, банк таке вміє.',
    );
  }

  let rows: Rows;
  let format: StatementFormat;
  try {
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      rows = parseXlsx(bytes);
      format = 'xlsx';
    } else if (isOleFile(bytes)) {
      rows = parseXls(bytes);
      format = 'xls';
    } else {
      const text = decodeText(bytes);
      const markup = /^\s*</.test(text) ? parseMarkupTable(text) : null;
      rows = markup ?? parseCsv(text);
      format = markup ? 'html' : 'csv';
    }
  } catch {
    throw new StatementFileError('Не вдалося прочитати файл. Схоже, він пошкоджений або це не таблиця.');
  }

  const { items, recognised } = rowsToStatement(rows);
  if (!recognised) {
    throw new StatementFileError(
      'У файлі немає колонок з датою і сумою. Перевірте, що це виписка по картці, а не квитанція.',
    );
  }
  if (!items.length) throw new StatementFileError('У виписці немає операцій. Оберіть період хоча б за 2 місяці.');
  return { items, format };
}
