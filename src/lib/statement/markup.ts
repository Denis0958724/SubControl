import type { Cell, Rows } from './csv';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function unescapeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Global regex matches without relying on matchAll. */
export function allMatches(re: RegExp, s: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m: RegExpExecArray | null;
  while ((m = g.exec(s)) !== null) {
    out.push(m);
    if (m[0] === '') g.lastIndex++;
  }
  return out;
}

export function stripTags(s: string): string {
  return unescapeXml(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

/**
 * Some banks save an HTML table or an "XML Spreadsheet 2003" file and call it .xls.
 * Both are read here as plain rows of text.
 */
export function parseMarkupTable(text: string): Rows | null {
  if (/<Workbook[\s>]/i.test(text) && /<Row[\s>]/i.test(text)) {
    const rows: Rows = [];
    for (const rowMatch of allMatches(/<Row\b[^>]*>([\s\S]*?)<\/Row>/i, text)) {
      const row: Cell[] = [];
      for (const cell of allMatches(/<Cell\b([^>]*)>([\s\S]*?)<\/Cell>|<Cell\b([^>]*)\/>/i, rowMatch[1])) {
        const attrs = cell[1] ?? cell[3] ?? '';
        const idx = /ss:Index="(\d+)"/i.exec(attrs);
        if (idx) while (row.length < Number(idx[1]) - 1) row.push(null);
        row.push(cell[2] !== undefined ? stripTags(cell[2]) : null);
      }
      rows.push(row);
    }
    return rows;
  }
  if (/<table[\s>]/i.test(text)) {
    const rows: Rows = [];
    for (const rowMatch of allMatches(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i, text)) {
      const row: Cell[] = [];
      for (const cell of allMatches(/<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/i, rowMatch[1])) {
        row.push(stripTags(cell[2]));
        const span = /colspan="?(\d+)/i.exec(cell[1]);
        if (span) for (let k = 1; k < Number(span[1]); k++) row.push(null);
      }
      rows.push(row);
    }
    return rows;
  }
  return null;
}
