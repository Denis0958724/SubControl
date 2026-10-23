import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { usePalette } from '../theme';

/** The app icon in miniature: a month ring on cobalt, the part already gone, and today's dot. */
export function LogoMark({ size = 30 }: { size?: number }) {
  const p = usePalette();
  // ring of radius 9 around (16,16): white from 12 o'clock clockwise to about 7 o'clock
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect width={32} height={32} rx={9} fill={p.cobalt} />
      <Circle cx={16} cy={16} r={9} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={3.6} fill="none" />
      <Path d="M16 7a9 9 0 1 1-6.4 15.4" stroke="#FFFFFF" strokeWidth={3.6} strokeLinecap="round" fill="none" />
      <Circle cx={7.6} cy={14.2} r={3.3} fill="#FFB938" />
    </Svg>
  );
}
