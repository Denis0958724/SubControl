import type { Cell, Rows } from './csv';
import { decodeCp1251, decodeLatin1, decodeUtf16le } from './decode';

/**
 * Minimal reader for old binary Excel files (.xls, BIFF8 inside an OLE container).
 * Reads only what a bank statement needs: text and numbers of the first worksheet.
 */

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const i32 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);

function f64(b: Uint8Array, o: number): number {
  return new DataView(b.buffer, b.byteOffset + o, 8).getFloat64(0, true);
}

const END_OF_CHAIN = 0xfffffffe;

export function isOleFile(b: Uint8Array): boolean {
  return b.length > 512 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
}

/** Pulls the "Workbook" stream out of an OLE compound file. */
function workbookStream(b: Uint8Array): Uint8Array {
  const sectorSize = 1 << u16(b, 0x1e);
  const miniSectorSize = 1 << u16(b, 0x20);
  const firstDir = u32(b, 0x30);
  const miniCutoff = u32(b, 0x38);
  const firstMiniFat = u32(b, 0x3c);
  let difatSector = u32(b, 0x44);
  const sectorAt = (sid: number) => (sid + 1) * sectorSize;

  // FAT sector list: 109 in the header, the rest in DIFAT sectors
  const fatSectors: number[] = [];
  for (let i = 0; i < 109; i++) {
    const sid = u32(b, 0x4c + i * 4);
    if (sid < END_OF_CHAIN) fatSectors.push(sid);
  }
  let guard = 0;
  while (difatSector < END_OF_CHAIN && guard++ < 10_000) {
    const off = sectorAt(difatSector);
    const per = sectorSize / 4 - 1;
    for (let i = 0; i < per; i++) {
      const sid = u32(b, off + i * 4);
      if (sid < END_OF_CHAIN) fatSectors.push(sid);
    }
    difatSector = u32(b, off + per * 4);
  }
  const fat: number[] = [];
  for (const sid of fatSectors) {
    const off = sectorAt(sid);
    for (let i = 0; i < sectorSize / 4; i++) fat.push(u32(b, off + i * 4));
  }

  const chain = (start: number, table: number[]) => {
    const out: number[] = [];
    let sid = start;
    while (sid < END_OF_CHAIN && out.length < table.length + 1) {
      out.push(sid);
      sid = table[sid];
    }
    return out;
  };
  const readChain = (start: number, size?: number) => {
    const sids = chain(start, fat);
    const out = new Uint8Array(sids.length * sectorSize);
    sids.forEach((sid, i) => out.set(b.subarray(sectorAt(sid), sectorAt(sid) + sectorSize), i * sectorSize));
    return size === undefined ? out : out.subarray(0, size);
  };

  const dir = readChain(firstDir);
  let root: { start: number; size: number } | null = null;
  let book: { start: number; size: number } | null = null;
  for (let off = 0; off + 128 <= dir.length; off += 128) {
    const nameLen = u16(dir, off + 0x40);
    if (!nameLen) continue;
    const name = decodeUtf16le(dir, off, off + nameLen - 2);
    const type = dir[off + 0x42];
    const entry = { start: u32(dir, off + 0x74), size: u32(dir, off + 0x78) };
    if (type === 5) root = entry;
    if (type === 2 && (name === 'Workbook' || name === 'Book')) book = entry;
  }
  if (!book) throw new Error('no workbook stream');
  if (book.size >= miniCutoff || !root) return readChain(book.start, book.size);

  // small streams live in the mini stream
  const miniStream = readChain(root.start, root.size);
  const miniFatBytes = readChain(firstMiniFat);
  const miniFat: number[] = [];
  for (let i = 0; i < miniFatBytes.length / 4; i++) miniFat.push(u32(miniFatBytes, i * 4));
  const sids = chain(book.start, miniFat);
  const out = new Uint8Array(sids.length * miniSectorSize);
  sids.forEach((sid, i) =>
    out.set(miniStream.subarray(sid * miniSectorSize, (sid + 1) * miniSectorSize), i * miniSectorSize),
  );
  return out.subarray(0, book.size);
}

/** Reads strings that may be split across SST + CONTINUE records. */
class SegmentReader {
  private seg = 0;
  private pos = 0;
  constructor(private segments: Uint8Array[]) {}
  private ensure() {
    while (this.seg < this.segments.length && this.pos >= this.segments[this.seg].length) {
      this.seg++;
      this.pos = 0;
    }
  }
  atSegmentStart() {
    this.ensure();
    return this.pos === 0 && this.seg > 0;
  }
  byte(): number {
    this.ensure();
    const s = this.segments[this.seg];
    if (!s) throw new Error('eof');
    return s[this.pos++];
  }
  u16() {
    return this.byte() | (this.byte() << 8);
  }
  u32() {
    return (this.u16() | (this.u16() << 16)) >>> 0;
  }
  skip(n: number) {
    for (let i = 0; i < n; i++) this.byte();
  }
  string(): string {
    const cch = this.u16();
    let flags = this.byte();
    const rich = flags & 0x08 ? this.u16() : 0;
    const ext = flags & 0x04 ? this.u32() : 0;
    let out = '';
    for (let i = 0; i < cch; i++) {
      // a CONTINUE record in the middle of characters starts with a fresh flags byte
      if (i > 0 && this.atSegmentStart()) flags = this.byte();
      out += String.fromCharCode(flags & 0x01 ? this.u16() : this.byte());
    }
    this.skip(rich * 4 + ext);
    return out;
  }
}

function rkValue(rk: number): number {
  let v: number;
  if (rk & 0x02) v = rk >> 2;
  else {
    const buf = new DataView(new ArrayBuffer(8));
    buf.setUint32(4, (rk & 0xfffffffc) >>> 0, true);
    v = buf.getFloat64(0, true);
  }
  return rk & 0x01 ? v / 100 : v;
}

function shortString(b: Uint8Array, o: number, biff8: boolean): string {
  const cch = u16(b, o);
  if (!biff8) return decodeCp1251(b.subarray(o + 2, o + 2 + cch));
  const flags = b[o + 2];
  return flags & 0x01 ? decodeUtf16le(b, o + 3, o + 3 + cch * 2) : decodeLatin1(b, o + 3, o + 3 + cch);
}

export function parseXls(bytes: Uint8Array): Rows {
  const wb = workbookStream(bytes);
  const records: { type: number; data: Uint8Array; offset: number }[] = [];
  for (let o = 0; o + 4 <= wb.length; ) {
    const type = u16(wb, o);
    const len = u16(wb, o + 2);
    records.push({ type, data: wb.subarray(o + 4, o + 4 + len), offset: o });
    o += 4 + len;
  }

  const biff8 = records[0]?.type === 0x0809 && u16(records[0].data, 0) === 0x0600;
  let sst: string[] = [];
  let sheetOffset = -1;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.type === 0x00fc) {
      const segments = [r.data];
      for (let j = i + 1; j < records.length && records[j].type === 0x003c; j++) segments.push(records[j].data);
      const reader = new SegmentReader(segments);
      reader.u32();
      const unique = reader.u32();
      sst = [];
      try {
        for (let k = 0; k < unique; k++) sst.push(reader.string());
      } catch {
        // keep what was read
      }
    } else if (r.type === 0x0085 && sheetOffset < 0) {
      const kind = r.data[5];
      if (kind === 0) sheetOffset = u32(r.data, 0);
    }
  }

  const rows: Rows = [];
  const put = (row: number, col: number, v: Cell) => {
    while (rows.length <= row) rows.push([]);
    const r = rows[row];
    while (r.length < col) r.push(null);
    r[col] = v;
  };

  const start = records.findIndex((r) => r.offset === sheetOffset);
  let pendingFormula: { row: number; col: number } | null = null;
  for (let i = start < 0 ? 0 : start + 1; i < records.length; i++) {
    const { type, data } = records[i];
    if (type === 0x000a) break; // EOF of the sheet
    switch (type) {
      case 0x00fd: // LABELSST
        put(u16(data, 0), u16(data, 2), sst[u32(data, 6)] ?? null);
        break;
      case 0x0203: // NUMBER
        put(u16(data, 0), u16(data, 2), f64(data, 6));
        break;
      case 0x027e: // RK
        put(u16(data, 0), u16(data, 2), rkValue(i32(data, 6) >>> 0));
        break;
      case 0x00bd: {
        // MULRK
        const row = u16(data, 0);
        const first = u16(data, 2);
        const count = (data.length - 6) / 6;
        for (let k = 0; k < count; k++) put(row, first + k, rkValue(u32(data, 4 + k * 6 + 2)));
        break;
      }
      case 0x0204: // LABEL
        put(u16(data, 0), u16(data, 2), shortString(data, 6, biff8));
        break;
      case 0x0006: {
        // FORMULA: cached number, or a string in the next STRING record
        const row = u16(data, 0);
        const col = u16(data, 2);
        if (u16(data, 12) === 0xffff && data[6] === 0) pendingFormula = { row, col };
        else if (u16(data, 12) !== 0xffff) put(row, col, f64(data, 6));
        break;
      }
      case 0x0207: // STRING
        if (pendingFormula) put(pendingFormula.row, pendingFormula.col, shortString(data, 0, biff8));
        pendingFormula = null;
        break;
    }
  }
  return rows.filter((r) => r.some((c) => c !== null && String(c).trim() !== ''));
}
