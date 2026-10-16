import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fonts, usePalette } from '../theme';

export type Variant = 'hero' | 'title' | 'heading' | 'body' | 'label' | 'caption';

const variants: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
};

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
  center?: boolean;
}

/** All text in the app goes through here so the type scale stays consistent. */
export function T({ variant = 'body', color, muted, center, style, ...rest }: Props) {
  const p = usePalette();
  return (
    <Text
      {...rest}
      style={[
        variants[variant],
        { color: color ?? (muted ? p.muted : p.ink) },
        center && styles.center,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({ center: { textAlign: 'center' } });
