import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

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
}

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

export function Button({ title, onPress, kind = 'primary', icon, disabled, loading, style, compact }: Props) {
  const p = usePalette();
  const bg = { primary: p.cobalt, secondary: p.cobaltSoft, ghost: 'transparent', danger: p.redSoft }[kind];
  const fg = { primary: p.onCobalt, secondary: p.cobalt, ghost: p.cobalt, danger: p.red }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
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
