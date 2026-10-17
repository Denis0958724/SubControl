import { strToU8, zipSync } from 'fflate';

import { CYCLE_LABEL, fromISO } from './dates';
import { chargeUAH, formatNumber, monthlyUAH, yearlyUAH } from './money';
import type { Rates, Subscription } from './types';

/**
 * "Export to a table": a real Excel file (.xlsx) instead of raw CSV text.
 * Opens nicely in Excel, Google Sheets and Numbers: coloured header, hryvnia formats,
 * real dates, frozen header with filters, and totals that are live formulas.
 * Written by hand (a few XML files zipped with fflate) to keep the app small.
 */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Excel stores dates as days since 1899-12-30. */
const excelDate = (iso: string) => {
  const d = fromISO(iso);
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86_400_000);
};

const colName = (i: number) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// Style ids, see STYLES below.
const S = {
  title: 1,
  subtitle: 2,
  header: 3,
  text: 4,
  date: 5,
  uah: 6,
  price: 7,
  muted: 8,
  totalLabel: 9,
  totalUah: 10,
  center: 11,
  mutedUah: 12,
  mutedDate: 13,
  soon: 14,
} as const;

type Cell =
  | { s: number; text: string }
  | { s: number; num: number }
  | { s: number; formula: string; value: number }
  | null;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3">
<numFmt numFmtId="164" formatCode="dd.mm.yyyy"/>
<numFmt numFmtId="165" formatCode="#,##0&quot; ₴&quot;"/>
<numFmt numFmtId="166" formatCode="#,##0.00"/>
</numFmts>
<fonts count="6">
<font><sz val="11"/><color rgb="FF1B2140"/><name val="Arial"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
<font><b/><sz val="16"/><color rgb="FF1B2140"/><name val="Arial"/></font>
<font><sz val="10"/><color rgb="FF7D8399"/><name val="Arial"/></font>
<font><b/><sz val="11"/><color rgb="FF1B2140"/><name val="Arial"/></font>
<font><b/><sz val="11"/><color rgb="FFC77A00"/><name val="Arial"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF2F4BFF"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE8ECFF"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFE4E6EE"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="15">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1" indent="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="165" fontId="4" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="164" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const HEADERS = [
  'Сервіс',
  'Ціна',
  'Валюта',
  'Як часто',
  'Наступне списання',
  'За раз, ₴',
  'На місяць, ₴',
  'На рік, ₴',
  'Ділите на',
  'Ваша частка на місяць, ₴',
  'Статус',
];
const WIDTHS = [24, 10, 9, 12, 19, 13, 14, 14, 11, 16, 12];

function cellXml(cell: Cell, ref: string): string {
  if (!cell) return '';
  if ('text' in cell) return `<c r="${ref}" s="${cell.s}" t="inlineStr"><is><t xml:space="preserve">${esc(cell.text)}</t></is></c>`;
  if ('formula' in cell) return `<c r="${ref}" s="${cell.s}"><f>${esc(cell.formula)}</f><v>${cell.value}</v></c>`;
  return `<c r="${ref}" s="${cell.s}"><v>${cell.num}</v></c>`;
}

export function buildSubscriptionsXlsx(subs: Subscription[], rates: Rates, today: string): Uint8Array {
  const active = subs.filter((s) => s.status === 'active').sort((a, b) => a.nextCharge.localeCompare(b.nextCharge));
  const cancelled = subs.filter((s) => s.status !== 'active');
  const round = (n: number) => Math.round(n * 100) / 100;
  const soon = (iso: string) => (fromISO(iso).getTime() - fromISO(today).getTime()) / 86_400_000 <= 3;

  const rows: { height?: number; cells: Cell[] }[] = [];
  rows.push({ height: 28, cells: [{ s: S.title, text: 'SubControl: мої підписки' }] });
  const [y, m, d] = today.split('-');
  rows.push({
    cells: [
      {
        s: S.subtitle,
        text: `Станом на ${d}.${m}.${y}. Курс: $1 = ${formatNumber(rates.USD, 2)} ₴, €1 = ${formatNumber(rates.EUR, 2)} ₴`,
      },
    ],
  });
  rows.push({ cells: [] });
  const headerRow = rows.length + 1;
  rows.push({ height: 32, cells: HEADERS.map((h) => ({ s: S.header, text: h })) });

  const line = (s: Subscription, isActive: boolean): Cell[] => {
    const muted = !isActive;
    const uah = muted ? S.mutedUah : S.uah;
    return [
      { s: muted ? S.muted : S.text, text: s.name },
      { s: S.price, num: s.amount },
      { s: S.center, text: s.currency === 'UAH' ? '₴' : s.currency },
      { s: muted ? S.muted : S.text, text: CYCLE_LABEL[s.cycle] },
      { s: muted ? S.mutedDate : soon(s.nextCharge) ? S.soon : S.date, num: excelDate(s.nextCharge) },
      { s: uah, num: round(chargeUAH(s, rates)) },
      { s: uah, num: round(monthlyUAH(s, rates)) },
      { s: uah, num: round(yearlyUAH(s, rates)) },
      { s: S.center, num: s.sharedWith },
      { s: uah, num: round(monthlyUAH(s, rates) / s.sharedWith) },
      { s: muted ? S.muted : S.text, text: isActive ? 'активна' : 'скасована' },
    ];
  };

  const first = rows.length + 1;
  active.forEach((s) => rows.push({ height: 20, cells: line(s, true) }));
  const last = rows.length;

  rows.push({ cells: [] });
  const sum = (col: string, fn: (s: Subscription) => number) => ({
    s: S.totalUah,
    formula: active.length ? `SUM(${col}${first}:${col}${last})` : '0',
    value: round(active.reduce((acc, s) => acc + fn(s), 0)),
  });
  rows.push({
    height: 22,
    cells: [
      { s: S.totalLabel, text: `Разом активних: ${active.length}` },
      { s: S.totalLabel, text: '' },
      { s: S.totalLabel, text: '' },
      { s: S.totalLabel, text: '' },
      { s: S.totalLabel, text: '' },
      { s: S.totalLabel, text: '' },
      sum('G', (s) => monthlyUAH(s, rates)),
      sum('H', (s) => yearlyUAH(s, rates)),
      { s: S.totalLabel, text: '' },
      sum('J', (s) => monthlyUAH(s, rates) / s.sharedWith),
      { s: S.totalLabel, text: '' },
    ],
  });

  if (cancelled.length) {
    rows.push({ cells: [] });
    rows.push({ cells: [{ s: S.subtitle, text: 'Скасовані: більше не рахуються в сумі' }] });
    cancelled.forEach((s) => rows.push({ height: 20, cells: line(s, false) }));
  }

  const lastCol = colName(HEADERS.length - 1);
  const sheetRows = rows
    .map((r, i) => {
      const n = i + 1;
      const attrs = r.height ? ` ht="${r.height}" customHeight="1"` : '';
      return `<row r="${n}"${attrs}>${r.cells.map((c, j) => cellXml(c, `${colName(j)}${n}`)).join('')}</row>`;
    })
    .join('');

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${WIDTHS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${sheetRows}</sheetData>
${active.length ? `<autoFilter ref="A${headerRow}:${lastCol}${last}"/>` : ''}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
    'docProps/app.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>SubControl</Application></Properties>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Підписки" sheetId="1" r:id="rId1"/></sheets>
${active.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Підписки'!$A$${headerRow}:$${lastCol}$${last}</definedName></definedNames>` : ''}
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    'xl/styles.xml': strToU8(STYLES),
    'xl/worksheets/sheet1.xml': strToU8(sheet),
  };
  return zipSync(files, { level: 6 });
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
