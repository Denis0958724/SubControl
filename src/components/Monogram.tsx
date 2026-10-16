import { View } from 'react-native';

import { initials } from '../lib/catalog';
import { fonts } from '../theme';
import { T } from './T';

interface Props {
  name: string;
  color: string;
  size?: number;
  faded?: boolean;
}

/** Round badge with the service's initials in its own colour. */
export function Monogram({ name, color, size = 40, faded }: Props) {
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
