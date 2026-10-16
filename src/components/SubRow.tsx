import { Pressable, StyleSheet, View } from 'react-native';

import { CYCLE_LABEL, diffDays, formatDate, relativeDay } from '../lib/dates';
import { chargeUAH, formatMoney, formatUAH } from '../lib/money';
import type { Rates, Subscription } from '../lib/types';
import { fonts, space, usePalette } from '../theme';
import { tap } from './Button';
import { Monogram } from './Monogram';
import { T } from './T';

interface Props {
  sub: Subscription;
  rates: Rates;
  today: string;
  onPress: () => void;
}

/** How soon a charge is considered "soon" and gets the amber marker. */
export const SOON_DAYS = 3;

export function SubRow({ sub, rates, today, onPress }: Props) {
  const p = usePalette();
  const cancelled = sub.status === 'cancelled';
  const days = diffDays(today, sub.nextCharge);
  const soon = !cancelled && days >= 0 && days <= SOON_DAYS;

  const meta = cancelled
    ? `скасовано ${sub.cancelledAt ? formatDate(sub.cancelledAt) : ''}`.trim()
    : `${CYCLE_LABEL[sub.cycle]}, ${formatDate(sub.nextCharge)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sub.name}, ${formatUAH(chargeUAH(sub, rates))}, ${meta}`}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Monogram name={sub.name} color={sub.color} faded={cancelled} />
      <View style={styles.middle}>
        <T variant="heading" numberOfLines={1} color={cancelled ? p.muted : p.ink} style={styles.name}>
          {sub.name}
        </T>
        <View style={styles.metaRow}>
          {soon && (
            <View style={[styles.soon, { backgroundColor: p.amberSoft }]}>
              <T variant="caption" color={p.amber} style={styles.soonText}>
                {relativeDay(sub.nextCharge, today)}
              </T>
            </View>
          )}
          <T variant="caption" muted numberOfLines={1} style={styles.flex}>
            {soon ? CYCLE_LABEL[sub.cycle] : meta}
          </T>
        </View>
      </View>
      <View style={styles.right}>
        <T
          variant="heading"
          color={cancelled ? p.muted : p.ink}
          style={[styles.amount, cancelled && styles.strike]}
        >
          {formatUAH(chargeUAH(sub, rates))}
        </T>
        {sub.currency !== 'UAH' && (
          <T variant="caption" muted>
            {formatMoney(sub.amount, sub.currency)}
          </T>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    minHeight: 68,
  },
  middle: { flex: 1, gap: 2 },
  flex: { flex: 1 },
  name: { fontSize: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  soon: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  soonText: { fontFamily: fonts.semibold },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 16, fontVariant: ['tabular-nums'] },
  strike: { textDecorationLine: 'line-through' },
});
