import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { MONTHS, daysInMonth, diffDays, fromISO, occurrencesInMonth } from '../lib/dates';
import { chargeUAH, formatUAH } from '../lib/money';
import type { Rates, Subscription } from '../lib/types';
import { fonts, radius, space, usePalette } from '../theme';
import { useCountUp, useReducedMotion } from './Motion';
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
 *
 * Opening the screen plays one short sequence: the arc sweeps to today, the total counts up,
 * the dots pop in one by one, and the charge that is about to happen keeps a slow pulse.
 */
export function MonthDial({ subs, rates, today, monthlyTotal, yearlyTotal, onPressSub }: Props) {
  const p = usePalette();
  const reduce = useReducedMotion();
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
    list.sort((a, b) => a.day - b.day);
    return { dots: list, spent: spentSum, ahead: aheadSum };
  }, [subs, rates, today, year, month0]);

  const angle = (day: number) => ((day - 1) / dim) * Math.PI * 2 - Math.PI / 2;
  const at = (day: number, r: number) => ({
    x: c + r * Math.cos(angle(day)),
    y: c + r * Math.sin(angle(day)),
  });

  // the elapsed arc sweeps in, then the dots pop in along it
  const elapsed = (todayDay - 1) / dim;
  const sweep = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      sweep.setValue(elapsed);
      pop.setValue(1);
      return;
    }
    const a = Animated.parallel([
      Animated.timing(sweep, { toValue: elapsed, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(pop, { toValue: 1, duration: 900, delay: 250, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]);
    a.start();
    return () => a.stop();
  }, [elapsed, sweep, pop, reduce]);
  const dashOffset = sweep.interpolate({ inputRange: [0, 1], outputRange: [C, 0] });

  // each dot gets its own slice of the pop, in calendar order
  const grow = (i: number, r: number) => {
    const n = Math.max(dots.length, 1);
    const start = (i / n) * 0.6;
    return pop.interpolate({
      inputRange: [start, start + 0.25, start + 0.4],
      outputRange: [0, r * 1.25, r],
      extrapolate: 'clamp',
    });
  };

  const shownMonthly = useCountUp(monthlyTotal);
  const shownYearly = useCountUp(yearlyTotal, 1100);

  const todayMark = at(todayDay, R - 17);
  const soonest = dots.find((d) => d.soon && !d.past);
  const a11y = `${MONTHS[month0]}: ${formatUAH(monthlyTotal)} на місяць. Вже списано ${formatUAH(spent)}, попереду ${formatUAH(ahead)}.`;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }} accessible accessibilityLabel={a11y}>
        <Svg width={size} height={size}>
          {/* day ticks */}
          {Array.from({ length: dim }, (_, i) => {
            const pt = at(i + 1, R - 17);
            return i + 1 === todayDay ? null : <Circle key={`t${i}`} cx={pt.x} cy={pt.y} r={1.3} fill={p.line} />;
          })}
          <Circle cx={c} cy={c} r={R} stroke={p.track} strokeWidth={12} fill="none" />
          <G transform={`rotate(-90 ${c} ${c})`}>
            <AnimatedCircle
              cx={c}
              cy={c}
              r={R}
              stroke={p.ink}
              strokeWidth={12}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${C} ${C}`}
              strokeDashoffset={dashOffset}
            />
          </G>
          <Circle cx={todayMark.x} cy={todayMark.y} r={4.5} fill={p.cobalt} />
          {dots.map((d, i) => {
            const pt = at(d.day, R + d.stack * 21);
            return (
              <G key={`${d.id}-${d.day}`} onPress={() => onPressSub(d.id)}>
                {d.soon && !d.past && (
                  <AnimatedCircle cx={pt.x} cy={pt.y} r={grow(i, 14)} stroke={p.amber} strokeWidth={2.5} fill={p.paper} />
                )}
                {/* charges already made are smaller; the ones ahead stand out */}
                <AnimatedCircle
                  cx={pt.x}
                  cy={pt.y}
                  r={grow(i, d.past ? 5.5 : 9)}
                  fill={d.color}
                  stroke={d.past ? p.ink : p.paper}
                  strokeWidth={d.past ? 2 : 3}
                />
                <Circle cx={pt.x} cy={pt.y} r={16} fill="transparent" />
              </G>
            );
          })}
        </Svg>
        {soonest && !reduce && <Pulse x={at(soonest.day, R + soonest.stack * 21).x} y={at(soonest.day, R + soonest.stack * 21).y} color={p.amber} />}
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <T variant="label" muted>
            {MONTHS[month0]}
          </T>
          <T variant="hero" numberOfLines={1} adjustsFontSizeToFit style={[styles.total, { maxWidth: R * 2 - 56 }]}>
            {formatUAH(Math.round(shownMonthly))}
          </T>
          <T variant="caption" muted>
            на місяць
          </T>
          <View style={[styles.yearPill, { backgroundColor: p.sheet }]}>
            <T variant="caption" style={styles.yearText}>
              {formatUAH(Math.round(shownYearly))} за рік
            </T>
          </View>
        </View>
      </View>
      <View style={styles.legend}>
        <Stat label="Вже списано" value={formatUAH(spent)} swatch={p.ink} />
        <Stat label="Ще попереду" value={formatUAH(ahead)} swatch={p.track} ring={p.line} />
      </View>
    </View>
  );
}

function Stat({ label, value, swatch, ring }: { label: string; value: string; swatch: string; ring?: string }) {
  const p = usePalette();
  return (
    <View style={[styles.stat, { backgroundColor: p.sheet }]}>
      <View style={styles.statHead}>
        <View style={[styles.swatch, { backgroundColor: swatch, borderColor: ring ?? swatch }]} />
        <T variant="caption" muted>
          {label}
        </T>
      </View>
      <T variant="heading" style={styles.num}>
        {value}
      </T>
    </View>
  );
}

/** A slow amber ripple around the charge that comes next. */
function Pulse({ x, y, color }: { x: number; y: number; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const opacity = v.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.7, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pulse, { left: x - 14, top: y - 14, borderColor: color, opacity, transform: [{ scale }] }]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space(4) },
  center: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  total: { marginTop: 2, fontVariant: ['tabular-nums'] },
  yearPill: { marginTop: space(2), borderRadius: 999, paddingHorizontal: space(3), paddingVertical: 4 },
  yearText: { fontFamily: fonts.semibold, fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', alignSelf: 'stretch', gap: space(3) },
  stat: { flex: 1, borderRadius: radius.card, paddingHorizontal: space(4), paddingVertical: space(3), gap: 2 },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  swatch: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  num: { fontVariant: ['tabular-nums'] },
  pulse: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 2.5 },
});
