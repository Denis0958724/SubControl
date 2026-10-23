import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '../lib/feedback';
import { useToast, type Toast } from '../lib/toast';
import { fonts, radius, space, usePalette } from '../theme';
import { Icon } from './Icon';
import { prefersReducedMotion } from './Motion';
import { T } from './T';

/** Shows the current toast: slides in from the top, leaves by itself. */
export function Toaster() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const current = useToast((s) => s.current);
  const hide = useToast((s) => s.hide);
  const [shown, setShown] = useState<Toast | null>(null);
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) {
      if (!shown) return;
      const out = Animated.timing(y, { toValue: 0, duration: prefersReducedMotion() ? 0 : 220, useNativeDriver: true });
      out.start(({ finished }) => finished && setShown(null));
      return () => out.stop();
    }
    setShown(current);
    AccessibilityInfo.announceForAccessibility([current.title, current.text].filter(Boolean).join('. '));
    y.setValue(0);
    if (prefersReducedMotion()) y.setValue(1);
    else Animated.spring(y, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 7 }).start();
    const timer = setTimeout(() => hide(current.id), current.action ? 5000 : 3200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!shown) return null;
  const accent = shown.tone === 'saved' ? p.green : p.cobalt;
  const icon = shown.icon ?? (shown.tone === 'saved' ? 'wallet' : 'check');
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + space(2), opacity: y, transform: [{ translateY }] }]}
    >
      <Pressable
        accessibilityRole="alert"
        onPress={() => hide(shown.id)}
        style={[styles.card, { backgroundColor: p.ink, shadowColor: p.shadow }]}
      >
        <View style={[styles.dot, { backgroundColor: accent }]}>
          <Icon name={icon} size={16} color="#FFFFFF" strokeWidth={2.4} />
        </View>
        <View style={styles.flex}>
          <T variant="label" color={p.paper} style={styles.title} numberOfLines={2}>
            {shown.title}
          </T>
          {shown.text ? (
            <T variant="caption" color={p.paper} style={styles.text} numberOfLines={2}>
              {shown.text}
            </T>
          ) : null}
        </View>
        {shown.action && (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              tap();
              shown.action!.run();
              hide(shown.id);
            }}
            style={({ pressed }) => [styles.action, { backgroundColor: p.paper, opacity: pressed ? 0.7 : 1 }]}
          >
            <Icon name="undo" size={15} color={p.ink} strokeWidth={2.2} />
            <T variant="caption" color={p.ink} style={styles.actionText}>
              {shown.action.label}
            </T>
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space(4), right: space(4), zIndex: 50, elevation: 50 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    borderRadius: radius.card,
    paddingVertical: space(3),
    paddingLeft: space(3),
    paddingRight: space(3),
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.semibold },
  text: { opacity: 0.75 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: space(3),
    paddingVertical: 7,
  },
  actionText: { fontFamily: fonts.semibold },
});
