import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { toISO } from './dates';
import type { StatementItem } from './detect';
import { StatementFileError, readStatement } from './statement';

export interface PickedStatement {
  items: StatementItem[];
  files: string[];
  /** files that could not be read, with the reason */
  failed: { name: string; reason: string }[];
}

/**
 * Lets the person pick one or more statement files (several cards are fine)
 * and reads them on the phone. Nothing is uploaded anywhere.
 */
export async function pickStatements(): Promise<PickedStatement | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: '*/*', // banks label the same file as Excel, HTML or text, so filtering by type hides valid files
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (res.canceled) return null;

  const out: PickedStatement = { items: [], files: [], failed: [] };
  const seen = new Set<string>();
  for (const asset of res.assets) {
    try {
      const buffer =
        Platform.OS === 'web' && asset.file ? await asset.file.arrayBuffer() : await new File(asset.uri).arrayBuffer();
      const { items } = readStatement(new Uint8Array(buffer));
      for (const it of items) {
        const day = toISO(new Date(it.time * 1000));
        const key = `${day}|${it.amount}|${it.description.toLowerCase().replace(/\s+/g, ' ').trim()}`;
        if (seen.has(key)) continue; // the same operation in two overlapping statements
        seen.add(key);
        out.items.push({ ...it, id: `${out.files.length}-${it.id}` });
      }
      out.files.push(asset.name);
    } catch (e) {
      out.failed.push({
        name: asset.name,
        reason: e instanceof StatementFileError ? e.message : 'Не вдалося відкрити файл.',
      });
    }
  }
  return out;
}
