import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { initials } from '../lib/catalog';
import { fonts, usePalette } from '../theme';
import { T } from './T';

interface Props {
  name: string;
  color: string;
  size?: number;
  faded?: boolean;
}

function parse(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Very dark badges (black brands) need an outline to stay visible in the dark theme. */
function isVeryDark(hex: string): boolean {
  const c = parse(hex);
  if (!c) return false;
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] < 70;
}

/** Mixes a colour with white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const c = parse(hex);
  if (!c) return hex;
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  const mix = c.map((v) => Math.round(v + (target - v) * k));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The service's badge: a rounded square in its own colour with a soft light-to-deep gradient
 * and one letter. No brand logos: those belong to their owners, and the stores check.
 */
export function Monogram({ name, color, size = 40, faded }: Props) {
  const p = usePalette();
  const gid = `m${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const letter = initials(name).slice(0, 1);
  const r = Math.round(size * 0.3);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: faded ? 0.4 : 1,
        borderWidth: isVeryDark(color) ? 1 : 0,
        borderColor: p.line,
      }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={shade(color, 0.22)} />
            <Stop offset="1" stopColor={shade(color, -0.12)} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${gid})`} />
      </Svg>
      <T
        style={{
          fontFamily: fonts.display,
          fontSize: size * 0.42,
          lineHeight: size * 0.56,
          color: '#FFFFFF',
          letterSpacing: 0,
        }}
      >
        {letter}
      </T>
    </View>
  );
}
