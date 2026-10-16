import { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { MONTHS, daysInMonth, diffDays, fromISO, occurrencesInMonth } from '../lib/dates';
import { chargeUAH, formatUAH } from '../lib/money';
import type { Rates, Subscription } from '../lib/types';
import { fonts, space, usePalette } from '../theme';
import { SOON_DAYS } from './SubRow';
import { T } from './T';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  subs: Subscription[];
  rates: Rates;
  today: string;
  monthlyTotal: number;
  yearlyTotal: number;
  onPressSub: (id: string) => void;
}

interface Dot {
  id: string;
  day: number;
  color: string;
  past: boolean;
  soon: boolean;
  stack: number;
  uah: number;
}

/**
 * The month as a dial: the dark arc is the part of the month already gone,
 * each coloured dot is a charge on its day. Answers "when will money leave?" at a glance.
 */
export function MonthDial({ subs, rates, today, monthlyTotal, yearlyTotal, onPressSub }: Props) {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const size = Math.min(width - space(10), 320);
  const c = size / 2;
  const R = c - 26;
  const C = 2 * Math.PI * R;

  const t = fromISO(today);
  const year = t.getFullYear();
  const month0 = t.getMonth();
  const todayDay = t.getDate();
  const dim = daysInMonth(year, month0);

  const { dots, spent, ahead } = useMemo(() => {
    const list: Dot[] = [];
    const perDay = new Map<number, number>();
    let spentSum = 0;
    let aheadSum = 0;
    for (const s of subs) {
      if (s.status !== 'active') continue;
      for (const iso of occurrencesInMonth(s.nextCharge, s.cycle, s.anchorDay, year, month0)) {
        const day = fromISO(iso).getDate();
        const stack = perDay.get(day) ?? 0;
        perDay.set(day, stack + 1);
        const past = iso < today;
        const uah = chargeUAH(s, rates);
        if (past) spentSum += uah;
        else aheadSum += uah;
        const d = diffDays(today, iso);
        list.push({ id: s.id, day, color: s.color, past, soon: d >= 0 && d <= SOON_DAYS, stack, uah });
      }
    }
    return { dots: list, spent: spentSum, ahead: aheadSum };
  }, [subs, rates, today, year, month0]);

  const angle = (day: number) => ((day - 1) / dim) * Math.PI * 2 - Math.PI / 2;
  const at = (day: number, r: number) => ({
    x: c + r * Math.cos(angle(day)),
    y: c + r * Math.sin(angle(day)),
  });

  // One orchestrated moment: the elapsed arc sweeps in when the screen opens.
  const elapsed = (todayDay - 1) / dim;
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          sweep.setValue(elapsed);
          return;
        }
        Animated.timing(sweep, {
          toValue: elapsed,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      });
    return () => {
      cancelled = true;
    };
  }, [elapsed, sweep]);
  const dashOffset = sweep.interpolate({ inputRange: [0, 1], outputRange: [C, 0] });

  const todayMark = at(todayDay, R - 17);
  const a11y = `${MONTHS[month0]}: ${formatUAH(monthlyTotal)} на місяць. Вже списано ${formatUAH(spent)}, попереду ${formatUAH(ahead)}.`;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }} accessible accessibilityLabel={a11y}>
        <Svg width={size} height={size}>
          {/* day ticks */}
          {Array.from({ length: dim }, (_, i) => {
            const pt = at(i + 1, R - 17);
            return i + 1 === todayDay ? null : (
              <Circle key={`t${i}`} cx={pt.x} cy={pt.y} r={1.3} fill={p.line} />
            );
          })}
          <Circle cx={c} cy={c} r={R} stroke={p.track} strokeWidth={10} fill="none" />
          <G transform={`rotate(-90 ${c} ${c})`}>
            <AnimatedCircle
              cx={c}
              cy={c}
              r={R}
              stroke={p.ink}
              strokeWidth={10}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${C} ${C}`}
              strokeDashoffset={dashOffset}
            />
          </G>
          <Circle cx={todayMark.x} cy={todayMark.y} r={4.5} fill={p.cobalt} />
          {dots.map((d) => {
            const pt = at(d.day, R + d.stack * 21);
            return (
              <G key={`${d.id}-${d.day}`} onPress={() => onPressSub(d.id)}>
                {d.soon && (
                  <Circle cx={pt.x} cy={pt.y} r={14} stroke={p.amber} strokeWidth={2.5} fill={p.paper} />
                )}
                {/* charges already made are smaller; the ones ahead stand out */}
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={d.past ? 5.5 : 9}
                  fill={d.color}
                  stroke={d.past ? p.ink : p.paper}
                  strokeWidth={d.past ? 2 : 3}
                />
                <Circle cx={pt.x} cy={pt.y} r={16} fill="transparent" />
              </G>
            );
          })}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <T variant="label" muted>
            {MONTHS[month0]}
          </T>
          <T
            variant="hero"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.total, { maxWidth: R * 2 - 56 }]}
          >
            {formatUAH(monthlyTotal)}
          </T>
          <T variant="caption" muted>
            на місяць
          </T>
          <View style={[styles.yearPill, { backgroundColor: p.sheet }]}>
            <T variant="caption" style={{ fontFamily: fonts.semibold }}>
              {formatUAH(yearlyTotal)} за рік
            </T>
          </View>
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: p.ink }]} />
          <View>
            <T variant="caption" muted>
              Вже списано
            </T>
            <T variant="heading" style={styles.num}>
              {formatUAH(spent)}
            </T>
          </View>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: p.track }]} />
          <View>
            <T variant="caption" muted>
              Ще попереду
            </T>
            <T variant="heading" style={styles.num}>
              {formatUAH(ahead)}
            </T>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space(4) },
  center: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  total: { marginTop: 2 },
  yearPill: { marginTop: space(2), borderRadius: 999, paddingHorizontal: space(3), paddingVertical: 4 },
  legend: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'center', gap: space(10) },
  legendItem: { flexDirection: 'row', gap: space(2), alignItems: 'flex-start' },
  legendSwatch: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  num: { fontVariant: ['tabular-nums'] },
});
