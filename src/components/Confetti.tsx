import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useToast } from '../lib/toast';
import { usePalette } from '../theme';
import { prefersReducedMotion } from './Motion';

const COUNT = 34;

interface Piece {
  x: number;
  drift: number;
  delay: number;
  spin: number;
  w: number;
  h: number;
  color: string;
  round: boolean;
}

/** A short confetti fall over the whole app. Triggered by celebrate(). */
export function Confetti() {
  const burst = useToast((s) => s.confetti);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (burst === 0 || prefersReducedMotion()) return;
    setActive(burst);
  }, [burst]);

  if (!active) return null;
  return <Burst key={active} onDone={() => setActive(0)} />;
}

function Burst({ onDone }: { onDone: () => void }) {
  const p = usePalette();
  const { width, height } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;

  const pieces = useMemo<Piece[]>(() => {
    const colors = [p.cobalt, p.amber, p.green, p.violet, p.red, '#FFFFFF'];
    return Array.from({ length: COUNT }, (_, i) => ({
      x: Math.random() * width,
      drift: (Math.random() - 0.5) * 120,
      delay: Math.random() * 0.25,
      spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
      w: 6 + Math.random() * 6,
      h: 9 + Math.random() * 8,
      color: colors[i % colors.length],
      round: i % 4 === 0,
    }));
  }, [p, width]);

  useEffect(() => {
    const a = Animated.timing(t, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true });
    a.start(() => onDone());
    return () => a.stop();
  }, [t, onDone]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((pc, i) => {
        const start = pc.delay;
        const range = [0, start, 1];
        const translateY = t.interpolate({ inputRange: range, outputRange: [-30, -30, height + 40] });
        const translateX = t.interpolate({ inputRange: [0, start, (start + 1) / 2, 1], outputRange: [0, 0, pc.drift, pc.drift * 0.4] });
        const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${pc.spin}deg`] });
        const opacity = t.interpolate({ inputRange: [0, start, start + 0.02, 0.85, 1], outputRange: [0, 0, 1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: pc.x,
              top: 0,
              width: pc.w,
              height: pc.round ? pc.w : pc.h,
              borderRadius: pc.round ? pc.w / 2 : 2,
              backgroundColor: pc.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
