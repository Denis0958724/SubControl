import { Platform, useColorScheme, type TextStyle } from 'react-native';

/**
 * SubControl palette.
 * Cobalt means "under control" (actions, today), amber means "money leaves soon".
 * Everything else stays quiet so the month dial on the home screen carries the screen.
 */
const light = {
  paper: '#F4F5F9',
  sheet: '#FFFFFF',
  ink: '#1B2140',
  inkSoft: '#4A5070',
  muted: '#7D8399',
  line: '#E4E6EE',
  track: '#E9EBF2',
  cobalt: '#2F4BFF',
  cobaltSoft: '#E8ECFF',
  onCobalt: '#FFFFFF',
  amber: '#E89A0C',
  amberSoft: '#FFF2D9',
  red: '#D93D42',
  redSoft: '#FDECEC',
  green: '#16865A',
  greenSoft: '#E3F5EC',
  violet: '#7B4DFF',
  violetSoft: '#EFE9FF',
  /** second stop of the cobalt gradient on hero cards and the main button */
  cobaltDeep: '#1F33D6',
  shadow: 'rgba(27, 33, 64, 0.18)',
};

const dark: typeof light = {
  paper: '#10132A',
  sheet: '#1A1E3A',
  ink: '#EEF0F8',
  inkSoft: '#C3C7DB',
  muted: '#8E94B3',
  line: '#2A2F52',
  track: '#262B4C',
  cobalt: '#7084FF',
  cobaltSoft: '#252D63',
  onCobalt: '#0D1030',
  amber: '#FFB938',
  amberSoft: '#3A2E12',
  red: '#FF6B70',
  redSoft: '#3D1A22',
  green: '#3CC68A',
  greenSoft: '#123327',
  violet: '#A98BFF',
  violetSoft: '#2B2257',
  cobaltDeep: '#4B5FF0',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

export type Palette = typeof light;

/** Accent families for icon tiles and badges. */
export type Tint = 'cobalt' | 'amber' | 'green' | 'red' | 'violet' | 'ink';

export function tintColors(p: Palette, tint: Tint): { fg: string; bg: string } {
  switch (tint) {
    case 'amber':
      return { fg: p.amber, bg: p.amberSoft };
    case 'green':
      return { fg: p.green, bg: p.greenSoft };
    case 'red':
      return { fg: p.red, bg: p.redSoft };
    case 'violet':
      return { fg: p.violet, bg: p.violetSoft };
    case 'ink':
      return { fg: p.inkSoft, bg: p.track };
    default:
      return { fg: p.cobalt, bg: p.cobaltSoft };
  }
}

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const fonts = {
  display: 'Unbounded_600SemiBold',
  displayRegular: 'Unbounded_400Regular',
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
};

/** 4-pt spacing grid */
export const space = (n: number) => n * 4;

export const radius = {
  row: 14,
  tile: 10,
  card: 20,
  sheet: 24,
  pill: 999,
};

/** Text fields show their own caret; the browser's focus box is noise on the web preview. */
export const noWebOutline: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {};
