export type Cell = string | number | null;
export type Rows = Cell[][];

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 30).join('\n');
  const counts = [';', ',', '\t'].map((d) => ({ d, n: sample.split(d).length }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].d;
}

/** RFC 4180-ish CSV reader with quotes, any of ; , or tab as the separator. */
export function parseCsv(text: string): Rows {
  const delim = detectDelimiter(text);
  const rows: Rows = [];
  let row: Cell[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === '') quoted = true;
    else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== null && String(c).trim() !== ''));
}
