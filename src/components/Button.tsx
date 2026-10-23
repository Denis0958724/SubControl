import { useId } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { feedback, tap, type Sound } from '../lib/feedback';
import { fonts, radius, space, usePalette } from '../theme';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './Motion';
import { T } from './T';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  kind?: Kind;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  /** what the press sounds like; screens that play their own result sound pass false */
  sound?: Sound | false;
}

export { tap };

/** Cobalt with a slight diagonal depth. Fills whatever box it sits in. */
export function CobaltFill({ radius: r = 0 }: { radius?: number }) {
  const p = usePalette();
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={p.cobalt} />
          <Stop offset="1" stopColor={p.cobaltDeep} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" rx={r} fill={`url(#${id})`} />
    </Svg>
  );
}

export function Button({ title, onPress, kind = 'primary', icon, disabled, loading, style, compact, sound = 'tap' }: Props) {
  const p = usePalette();
  // disabled buttons stay solid: a see-through button over a list looks broken
  const off = disabled && kind !== 'ghost';
  const bg = off ? p.track : { primary: p.cobalt, secondary: p.cobaltSoft, ghost: 'transparent', danger: p.redSoft }[kind];
  const fg = disabled ? p.muted : { primary: p.onCobalt, secondary: p.cobalt, ghost: p.cobalt, danger: p.red }[kind];
  const lifted = kind === 'primary' && !disabled;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={() => {
        if (sound) feedback(sound);
        onPress();
      }}
      style={[
        styles.base,
        compact && styles.compact,
        { backgroundColor: bg },
        lifted && [styles.lifted, { shadowColor: p.cobalt }],
        style,
      ]}
    >
      {lifted && <CobaltFill radius={compact ? 21 : 27} />}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.inner}>
          {icon && <Icon name={icon} size={20} color={fg} />}
          <T style={[styles.title, { color: fg }]} numberOfLines={1}>
            {title}
          </T>
        </View>
      )}
    </PressableScale>
  );
}

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'plain' | 'filled';
}

export function IconButton({ icon, onPress, label, tone = 'filled' }: IconButtonProps) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      to={0.88}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.iconBtn, { backgroundColor: tone === 'filled' ? p.sheet : 'transparent' }]}
    >
      <Icon name={icon} color={p.ink} size={22} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.pill,
    paddingHorizontal: space(6),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  compact: { minHeight: 42, paddingHorizontal: space(4) },
  lifted: {
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
