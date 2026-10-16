import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { feedback, tap, type Sound } from '../lib/feedback';
import { fonts, radius, space, usePalette } from '../theme';
import { Icon, type IconName } from './Icon';
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

export function Button({ title, onPress, kind = 'primary', icon, disabled, loading, style, compact, sound = 'tap' }: Props) {
  const p = usePalette();
  // disabled buttons stay solid: a see-through button over a list looks broken
  const bg = disabled && kind !== 'ghost'
    ? p.track
    : { primary: p.cobalt, secondary: p.cobaltSoft, ghost: 'transparent', danger: p.redSoft }[kind];
  const fg = disabled ? p.muted : { primary: p.onCobalt, secondary: p.cobalt, ghost: p.cobalt, danger: p.red }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled || loading}
      onPress={() => {
        if (sound) feedback(sound);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: bg, opacity: pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.inner}>
          {icon && <Icon name={icon} size={20} color={fg} />}
          <T style={[styles.title, { color: fg }]}>{title}</T>
        </View>
      )}
    </Pressable>
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: tone === 'filled' ? p.sheet : 'transparent', opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} color={p.ink} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.pill,
    paddingHorizontal: space(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 42, paddingHorizontal: space(4) },
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
