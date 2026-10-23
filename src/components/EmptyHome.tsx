import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { findService } from '../lib/catalog';
import { fonts, radius, space, usePalette } from '../theme';
import { Button, tap } from './Button';
import { Monogram } from './Monogram';
import { FadeIn, PressableScale, useReducedMotion } from './Motion';
import { T } from './T';

const ORBIT = ['netflix', 'spotify', 'youtube', 'megogo', 'chatgpt', 'icloud'];
const QUICK = ['netflix', 'spotify', 'youtube', 'megogo', 'icloud', 'chatgpt', 'sweettv', 'duolingo'];

interface Props {
  onAdd: () => void;
  onQuick: (serviceId: string) => void;
  onImport: () => void;
}

/** First launch: an empty ring with services floating around it, and one-tap starts. */
export function EmptyHome({ onAdd, onQuick, onImport }: Props) {
  const p = usePalette();
  const quick = QUICK.map((id) => findService(id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  return (
    <View style={styles.wrap}>
      <Orbit />
      <FadeIn delay={150} style={styles.copy}>
        <T variant="title" center>
          Додайте підписки
        </T>
        <T variant="body" muted center style={styles.lead}>
          Порахуємо в гривнях і нагадаємо до списання.
        </T>
      </FadeIn>

      <FadeIn delay={260} style={styles.quickBlock}>
        <T variant="label" muted center style={styles.quickTitle}>
          Популярні
        </T>
        <View style={styles.chips}>
          {quick.map((s) => (
            <PressableScale
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`Додати ${s.name}`}
              to={0.94}
              onPress={() => {
                tap();
                onQuick(s.id);
              }}
              style={[styles.chip, { backgroundColor: p.sheet }]}
            >
              <Monogram name={s.name} color={s.color} size={24} />
              <T variant="label" style={styles.chipText}>
                {s.name}
              </T>
            </PressableScale>
          ))}
        </View>
      </FadeIn>

      <FadeIn delay={340} style={styles.actions}>
        <Button title="Інший сервіс" icon="plus" onPress={onAdd} />
        <Button title="Знайти у виписці банку" icon="bolt" kind="secondary" onPress={onImport} />
      </FadeIn>
    </View>
  );
}

/** Six services drifting around an empty month ring. Waiting to be counted. */
function Orbit() {
  const p = usePalette();
  const reduce = useReducedMotion();
  const size = 220;
  const c = size / 2;
  const R = 78;
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }),
    );
    loop.start();
    return () => loop.stop();
  }, [t, reduce]);

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={R} stroke={p.track} strokeWidth={12} fill="none" />
        <Circle cx={c} cy={c} r={R - 20} stroke={p.line} strokeWidth={1} strokeDasharray="2 6" fill="none" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <T style={[styles.question, { color: p.ink }]}>? ₴</T>
        <T variant="caption" muted>
          на місяць
        </T>
      </View>
      {ORBIT.map((id, i) => {
        const s = findService(id);
        if (!s) return null;
        const a = (i / ORBIT.length) * Math.PI * 2 - Math.PI / 2;
        const x = c + R * Math.cos(a) - 19;
        const y = c + R * Math.sin(a) - 19;
        // each badge bobs on its own phase, so the group never moves in lockstep
        const phase = (i / ORBIT.length) * Math.PI * 2;
        const steps = Array.from({ length: 9 }, (_, k) => k / 8);
        const translateY = t.interpolate({
          inputRange: steps,
          outputRange: steps.map((x) => Math.sin(x * Math.PI * 2 + phase) * 5),
        });
        return (
          <FadeIn key={id} delay={i * 70} from={8} style={{ position: 'absolute', left: x, top: y }}>
            <Animated.View style={{ transform: [{ translateY }] }}>
              <Monogram name={s.name} color={s.color} size={38} />
            </Animated.View>
          </FadeIn>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: space(2) },
  center: { alignItems: 'center', justifyContent: 'center' },
  question: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  copy: { gap: space(2), marginTop: space(4), maxWidth: 360, alignItems: 'center' },
  lead: { maxWidth: 340 },
  quickBlock: { alignSelf: 'stretch', marginTop: space(6), gap: space(3) },
  quickTitle: { fontFamily: fonts.semibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space(2) },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    borderRadius: radius.pill,
    paddingLeft: 6,
    paddingRight: space(3),
    paddingVertical: 6,
  },
  chipText: { fontFamily: fonts.semibold },
  actions: { alignSelf: 'stretch', gap: space(2), marginTop: space(6) },
});
