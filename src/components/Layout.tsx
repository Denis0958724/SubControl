import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, usePalette } from '../theme';
import { IconButton, tap } from './Button';
import { Icon, type IconName } from './Icon';
import { T } from './T';

interface ScreenProps {
  children: ReactNode;
  /** content pinned to the bottom (main action) */
  footer?: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
}

export function Screen({ children, footer, header, scroll = true }: ScreenProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const body = (
    <View style={[styles.content, { paddingBottom: footer ? space(44) + insets.bottom : space(10) + insets.bottom }]}>
      {children}
    </View>
  );
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: p.paper, paddingTop: insets.top }]}
    >
      {header}
      {scroll ? (
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{body}</View>
      )}
      {footer && (
        <View
          pointerEvents="box-none"
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space(4)) + space(2) }]}
        >
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  backIcon?: IconName;
  right?: ReactNode;
}

export function Header({ title, onBack, backIcon = 'arrowLeft', right }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {onBack && <IconButton icon={backIcon} label="Назад" onPress={onBack} />}
      </View>
      <T variant="heading" numberOfLines={1} style={styles.headerTitle}>
        {title ?? ''}
      </T>
      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  );
}

/** A white sheet that groups related rows. */
export function Group({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const p = usePalette();
  return <View style={[styles.group, { backgroundColor: p.sheet }, style]}>{children}</View>;
}

export function Divider({ inset = space(4) }: { inset?: number }) {
  const p = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.line, marginLeft: inset }} />;
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <T variant="label" muted>
        {children}
      </T>
      {action}
    </View>
  );
}

interface LineProps {
  icon?: IconName;
  title: string;
  value?: string;
  hint?: string;
  onPress?: () => void;
  right?: ReactNode;
  tone?: 'default' | 'danger' | 'accent';
}

/** A settings-style row: icon, title, value or control on the right. */
export function Line({ icon, title, value, hint, onPress, right, tone = 'default' }: LineProps) {
  const p = usePalette();
  const color = tone === 'danger' ? p.red : tone === 'accent' ? p.cobalt : p.ink;
  const inner = (
    <View style={styles.line}>
      {icon && <Icon name={icon} size={20} color={tone === 'default' ? p.inkSoft : color} />}
      <View style={styles.flex}>
        <T variant="body" color={color}>
          {title}
        </T>
        {hint && (
          <T variant="caption" muted>
            {hint}
          </T>
        )}
      </View>
      {value && (
        <T variant="body" muted>
          {value}
        </T>
      )}
      {right}
      {onPress && !right && <Icon name="chevronRight" size={18} color={p.muted} />}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {inner}
    </Pressable>
  );
}

export function ProBadge() {
  const p = usePalette();
  return (
    <View style={[styles.pro, { backgroundColor: p.cobaltSoft }]}>
      <T variant="caption" color={p.cobalt} style={styles.proText}>
        Pro
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space(5), paddingTop: space(2), gap: space(3) },
  footer: { position: 'absolute', left: space(5), right: space(5), bottom: 0 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(3),
  },
  headerSide: { width: 96, flexDirection: 'row' },
  headerRight: { justifyContent: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center' },
  group: { borderRadius: radius.sheet, overflow: 'hidden' },
  sectionTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space(4),
    paddingHorizontal: space(1),
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
    minHeight: 56,
    paddingVertical: space(3),
  },
  pro: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1 },
  proText: { fontFamily: 'Onest_600SemiBold' },
});
