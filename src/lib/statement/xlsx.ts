import { unzipSync } from 'fflate';

import type { Cell, Rows } from './csv';
import { decodeUtf8Strict } from './decode';
import { allMatches, unescapeXml } from './markup';

/** "AB12" → 27 (zero-based column index) */
function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

/** Drops namespace prefixes like <x:row> so one set of patterns fits every writer. */
const unprefix = (xml: string) => xml.replace(/<(\/?)[A-Za-z]\w*:/g, '<$1');

function textOf(xml: string): string {
  return allMatches(/<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/, xml)
    .map((m) => unescapeXml(m[1] ?? ''))
    .join('');
}

/** Reads the first worksheet of an .xlsx file into rows of cells. */
export function parseXlsx(bytes: Uint8Array): Rows {
  const files = unzipSync(bytes, {
    filter: (f) => f.name.startsWith('xl/'),
  });
  const read = (name: string) => (files[name] ? unprefix(decodeUtf8Strict(files[name]) ?? '') : '');

  // Which file is the first sheet: workbook.xml lists sheets, the .rels file maps them to paths.
  let sheetPath = '';
  const firstSheet = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(read('xl/workbook.xml'))
    ?? /<sheet\b[^>]*\bid="([^"]+)"/.exec(read('xl/workbook.xml'));
  if (firstSheet) {
    for (const rel of allMatches(/<Relationship\b([^>]*)\/?>/, read('xl/_rels/workbook.xml.rels'))) {
      if (new RegExp(`Id="${firstSheet[1]}"`).test(rel[1])) {
        const target = /Target="([^"]+)"/.exec(rel[1])?.[1] ?? '';
        sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
      }
    }
  }
  if (!files[sheetPath]) {
    sheetPath = Object.keys(files)
      .filter((n) => /^xl\/worksheets\/[^/]+\.xml$/.test(n))
      .sort()[0];
  }
  if (!sheetPath) return [];

  const shared = allMatches(/<si\b[^>]*>([\s\S]*?)<\/si>/, read('xl/sharedStrings.xml')).map((m) => textOf(m[1]));

  const rows: Rows = [];
  for (const rowMatch of allMatches(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/, read(sheetPath))) {
    const rIdx = Number(/\br="(\d+)"/.exec(rowMatch[1])?.[1] ?? rows.length + 1) - 1;
    const row: Cell[] = [];
    for (const c of allMatches(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/, rowMatch[2] ?? '')) {
      const attrs = c[1];
      const body = c[2] ?? '';
      const ref = /\br="([A-Z]+)\d*"/.exec(attrs)?.[1];
      const col = ref ? colIndex(ref) : row.length;
      const type = /\bt="(\w+)"/.exec(attrs)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value: Cell = null;
      if (type === 's' && v !== undefined) value = shared[Number(v)] ?? null;
      else if (type === 'inlineStr') value = textOf(body);
      else if (type === 'str' || type === 'e') value = v !== undefined ? unescapeXml(v) : null;
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else if (v !== undefined) value = Number(v);
      while (row.length < col) row.push(null);
      row[col] = value;
    }
    while (rows.length < rIdx) rows.push([]);
    rows[rIdx] = row;
  }
  return rows.filter((r) => r && r.length);
}
