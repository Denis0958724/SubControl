import { View } from 'react-native';

import { initials } from '../lib/catalog';
import { fonts, usePalette } from '../theme';
import { T } from './T';

interface Props {
  name: string;
  color: string;
  size?: number;
  faded?: boolean;
}

/** Very dark badges (black brands) need an outline to stay visible in the dark theme. */
function isVeryDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum < 70;
}

/** Round badge with the service's initials in its own colour. */
export function Monogram({ name, color, size = 40, faded }: Props) {
  const p = usePalette();
  const letters = initials(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: faded ? 0.45 : 1,
        borderWidth: isVeryDark(color) ? 1 : 0,
        borderColor: p.line,
      }}
    >
      <T
        style={{
          fontFamily: fonts.display,
          fontSize: size * (letters.length > 1 ? 0.3 : 0.4),
          lineHeight: size * 0.5,
          color: '#FFFFFF',
          letterSpacing: 0,
        }}
      >
        {letters}
      </T>
    </View>
  );
}
