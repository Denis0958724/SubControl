import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radius, space, tintColors, usePalette, type Tint } from '../theme';
import { IconButton, tap } from './Button';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './Motion';
import { T } from './T';

/** Where a divider starts in a group of rows with icon tiles: past the tile. */
export const ROW_INSET = space(15);

interface ScreenProps {
  children: ReactNode;
  /** content pinned to the bottom (main action) */
  footer?: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  /** footer floats over the content (home screen); otherwise it sits in its own bar below it */
  floating?: boolean;
}

export function Screen({ children, footer, header, scroll = true, floating = false }: ScreenProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const bottomGap = footer ? (floating ? space(32) : space(6)) : space(10) + insets.bottom;
  const body = <View style={[styles.content, { paddingBottom: bottomGap }]}>{children}</View>;
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
          style={[
            floating ? styles.floating : [styles.bar, { backgroundColor: p.paper, borderTopColor: p.line }],
            { paddingBottom: Math.max(insets.bottom, space(4)) + space(2) },
          ]}
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
      <T variant="label" muted style={styles.sectionText}>
        {children}
      </T>
      {action}
    </View>
  );
}

/** A rounded tile with an icon (or a short glyph like "$") in a soft accent colour. */
export function IconTile({ icon, glyph, tint = 'cobalt', size = 32 }: { icon?: IconName; glyph?: string; tint?: Tint; size?: number }) {
  const p = usePalette();
  const c = tintColors(p, tint);
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.31, backgroundColor: c.bg }]}>
      {icon ? (
        <Icon name={icon} size={size * 0.58} color={c.fg} />
      ) : (
        <T style={{ fontFamily: fonts.semibold, fontSize: size * 0.5, lineHeight: size * 0.62, color: c.fg }}>{glyph}</T>
      )}
    </View>
  );
}

interface LineProps {
  icon?: IconName;
  /** short text instead of an icon, e.g. "$" */
  glyph?: string;
  tint?: Tint;
  title: string;
  value?: string;
  hint?: string;
  onPress?: () => void;
  right?: ReactNode;
  tone?: 'default' | 'danger' | 'accent';
}

/** A settings-style row: icon, title, value or control on the right. */
export function Line({ icon, glyph, tint, title, value, hint, onPress, right, tone = 'default' }: LineProps) {
  const p = usePalette();
  const color = tone === 'danger' ? p.red : tone === 'accent' ? p.cobalt : p.ink;
  const tileTint: Tint = tint ?? (tone === 'danger' ? 'red' : 'cobalt');
  const inner = (
    <View style={styles.line}>
      {(icon || glyph) && <IconTile icon={icon} glyph={glyph} tint={tileTint} />}
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
    <PressableScale
      accessibilityRole="button"
      to={0.985}
      onPress={() => {
        tap();
        onPress();
      }}
    >
      {inner}
    </PressableScale>
  );
}

export function ProBadge() {
  const p = usePalette();
  return (
    <View style={[styles.pro, { backgroundColor: p.violetSoft }]}>
      <Icon name="sparkle" size={11} color={p.violet} strokeWidth={2.4} />
      <T variant="caption" color={p.violet} style={styles.proText}>
        Pro
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space(5), paddingTop: space(2), gap: space(3) },
  floating: { position: 'absolute', left: space(5), right: space(5), bottom: 0 },
  bar: { paddingHorizontal: space(5), paddingTop: space(3), borderTopWidth: StyleSheet.hairlineWidth },
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
  sectionText: { fontFamily: fonts.semibold },
  tile: { alignItems: 'center', justifyContent: 'center' },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
    minHeight: 56,
    paddingVertical: space(3),
  },
  pro: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  proText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15 },
});
