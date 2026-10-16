import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MONTHS, WEEKDAYS_SHORT, daysInMonth, fromISO, toISO } from '../lib/dates';
import type { ISODate } from '../lib/types';
import { fonts, space, usePalette } from '../theme';
import { IconButton, tap } from './Button';
import { T } from './T';

interface Props {
  value: ISODate;
  today: ISODate;
  onChange: (value: ISODate) => void;
}

/** Month grid that looks the same on iOS, Android and web. */
export function CalendarPicker({ value, today, onChange }: Props) {
  const p = usePalette();
  const v = fromISO(value);
  const [cursor, setCursor] = useState({ y: v.getFullYear(), m: v.getMonth() });

  const first = new Date(cursor.y, cursor.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const dim = daysInMonth(cursor.y, cursor.m);
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const shift = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <IconButton icon="chevronLeft" label="Попередній місяць" tone="plain" onPress={() => shift(-1)} />
        <T variant="heading">
          {MONTHS[cursor.m]} {cursor.y}
        </T>
        <IconButton icon="chevronRight" label="Наступний місяць" tone="plain" onPress={() => shift(1)} />
      </View>
      <View style={styles.grid}>
        {WEEKDAYS_SHORT.map((w) => (
          <View key={w} style={styles.cell}>
            <T variant="caption" muted>
              {w}
            </T>
          </View>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <View key={`e${i}`} style={styles.cell} />;
          const iso = toISO(new Date(cursor.y, cursor.m, day));
          const selected = iso === value;
          const isToday = iso === today;
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={iso}
              onPress={() => {
                tap();
                onChange(iso);
              }}
              style={styles.cell}
            >
              <View
                style={[
                  styles.day,
                  selected && { backgroundColor: p.cobalt },
                  !selected && isToday && { borderWidth: 1.5, borderColor: p.cobalt },
                ]}
              >
                <T
                  variant="label"
                  color={selected ? p.onCobalt : p.ink}
                  style={{ fontFamily: selected ? fonts.semibold : fonts.regular }}
                >
                  {day}
                </T>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space(2), paddingBottom: space(3) },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
