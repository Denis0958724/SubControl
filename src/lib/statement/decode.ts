/**
 * Text decoding without relying on TextDecoder: Hermes on phones does not know
 * Windows-1251, and many Ukrainian banks still export CSV in it.
 */

/** Unicode code points for bytes 0x80–0xFF in Windows-1251. */
const CP1251_HIGH = [
  0x0402, 0x0403, 0x201a, 0x0453, 0x201e, 0x2026, 0x2020, 0x2021, 0x20ac, 0x2030, 0x0409, 0x2039, 0x040a, 0x040c,
  0x040b, 0x040f, 0x0452, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0xfffd, 0x2122, 0x0459, 0x203a,
  0x045a, 0x045c, 0x045b, 0x045f, 0x00a0, 0x040e, 0x045e, 0x0408, 0x00a4, 0x0490, 0x00a6, 0x00a7, 0x0401, 0x00a9,
  0x0404, 0x00ab, 0x00ac, 0x00ad, 0x00ae, 0x0407, 0x00b0, 0x00b1, 0x0406, 0x0456, 0x0491, 0x00b5, 0x00b6, 0x00b7,
  0x0451, 0x2116, 0x0454, 0x00bb, 0x0458, 0x0405, 0x0455, 0x0457,
];

export function decodeCp1251(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b < 0xc0) out += String.fromCharCode(CP1251_HIGH[b - 0x80]);
    else out += String.fromCharCode(0x0410 + (b - 0xc0)); // А..я are contiguous
  }
  return out;
}

/** Strict UTF-8 decoder; returns null when the bytes are not valid UTF-8. */
export function decodeUtf8Strict(bytes: Uint8Array): string | null {
  let out = '';
  let i = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) i = 3; // BOM
  const chunk: number[] = [];
  const flush = () => {
    out += String.fromCharCode(...chunk);
    chunk.length = 0;
  };
  while (i < bytes.length) {
    const b = bytes[i];
    let cp: number;
    let extra: number;
    if (b < 0x80) {
      cp = b;
      extra = 0;
    } else if (b >= 0xc2 && b < 0xe0) {
      cp = b & 0x1f;
      extra = 1;
    } else if (b >= 0xe0 && b < 0xf0) {
      cp = b & 0x0f;
      extra = 2;
    } else if (b >= 0xf0 && b < 0xf5) {
      cp = b & 0x07;
      extra = 3;
    } else return null;
    if (i + extra >= bytes.length + (extra ? 0 : 1)) return null;
    for (let k = 1; k <= extra; k++) {
      const c = bytes[i + k];
      if (c === undefined || (c & 0xc0) !== 0x80) return null;
      cp = (cp << 6) | (c & 0x3f);
    }
    i += extra + 1;
    if (cp > 0xffff) {
      cp -= 0x10000;
      chunk.push(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    } else chunk.push(cp);
    if (chunk.length > 4096) flush();
  }
  flush();
  return out;
}

/** UTF-8 first, Windows-1251 as the fallback. */
export function decodeText(bytes: Uint8Array): string {
  return decodeUtf8Strict(bytes) ?? decodeCp1251(bytes);
}

export function decodeUtf16le(bytes: Uint8Array, start = 0, end = bytes.length): string {
  let out = '';
  for (let i = start; i + 1 < end; i += 2) out += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
  return out;
}

export function decodeLatin1(bytes: Uint8Array, start = 0, end = bytes.length): string {
  let out = '';
  for (let i = start; i < end; i++) out += String.fromCharCode(bytes[i]);
  return out;
}
