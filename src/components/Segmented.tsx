import { Pressable, StyleSheet, View } from 'react-native';

import { fonts, radius, usePalette } from '../theme';
import { tap } from './Button';
import { T } from './T';

interface Props<V extends string | number> {
  options: { value: V; label: string; locked?: boolean }[];
  value: V;
  onChange: (value: V) => void;
}

export function Segmented<V extends string | number>({ options, value, onChange }: Props<V>) {
  const p = usePalette();
  return (
    <View style={[styles.track, { backgroundColor: p.track }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.item, active && { backgroundColor: p.ink }]}
          >
            <T
              variant="label"
              color={active ? p.paper : o.locked ? p.muted : p.ink}
              style={{ fontFamily: active ? fonts.semibold : fonts.medium }}
            >
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.pill, padding: 4 },
  item: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
