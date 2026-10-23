import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { fonts, radius, usePalette } from '../theme';
import { tap } from './Button';
import { Icon } from './Icon';
import { useReducedMotion } from './Motion';
import { T } from './T';

interface Props<V extends string | number> {
  options: { value: V; label: string; locked?: boolean }[];
  value: V;
  onChange: (value: V) => void;
}

const PAD = 4;

/** A pill switch whose dark thumb slides to the chosen option. */
export function Segmented<V extends string | number>({ options, value, onChange }: Props<V>) {
  const p = usePalette();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  // a value that is not among the options (an older setting) shows no thumb at all
  const index = options.findIndex((o) => o.value === value);
  const itemW = width > 0 ? (width - PAD * 2) / options.length : 0;
  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (!itemW || index < 0) return;
    const to = index * itemW;
    if (!placed.current || reduce) {
      x.setValue(to);
      placed.current = true;
      return;
    }
    Animated.spring(x, { toValue: to, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [index, itemW, reduce, x]);

  return (
    <View
      style={[styles.track, { backgroundColor: p.track }]}
      accessibilityRole="radiogroup"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {itemW > 0 && index >= 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { width: itemW, backgroundColor: p.ink, transform: [{ translateX: x }] }]}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.locked ? `${o.label}, у Pro` : o.label}
            onPress={() => {
              if (active) return;
              tap();
              onChange(o.value);
            }}
            style={[styles.item, itemW === 0 && active && { backgroundColor: p.ink }]}
          >
            <View style={styles.label}>
              {o.locked && !active && <Icon name="lock" size={13} color={p.muted} strokeWidth={2.2} />}
              <T
                variant="label"
                color={active ? p.paper : o.locked ? p.muted : p.ink}
                style={{ fontFamily: active ? fonts.semibold : fonts.medium }}
                numberOfLines={1}
              >
                {o.label}
              </T>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.pill, padding: PAD },
  thumb: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.pill },
  item: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  label: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
