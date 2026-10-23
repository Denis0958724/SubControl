import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Small motion kit on top of React Native's own Animated: no extra native modules,
 * so nothing new for the store builds to trip over.
 * Every animation here steps aside when the phone asks for reduced motion.
 */

let reduceNow = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    reduceNow = v;
  })
  .catch(() => {});

export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(reduceNow);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        reduceNow = v;
        if (alive) setReduce(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      reduceNow = v;
      setReduce(v);
    });
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

/** For one-off animations started outside React (toasts, confetti). */
export const prefersReducedMotion = () => reduceNow;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** how far it sinks while pressed */
  to?: number;
}

/** A pressable that gives way a little under the finger, like a real button. */
export function PressableScale({ children, style, to = 0.97, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduce = useReducedMotion();
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue === 1 ? 8 : 0 }).start();
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!reduce) spring(to);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduce) spring(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

interface FadeInProps {
  children: ReactNode;
  /** ms before it starts, for a staggered list */
  delay?: number;
  /** how far it rises, px */
  from?: number;
  style?: StyleProp<ViewStyle>;
}

/** Content that rises into place when the screen opens. */
export function FadeIn({ children, delay = 0, from = 14, style }: FadeInProps) {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(reduceNow ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) {
      v.setValue(1);
      return;
    }
    const a = Animated.timing(v, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [v, delay, reduce]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Stagger helper: a little later for each next item, capped so long lists don't keep you waiting. */
export const stagger = (i: number, step = 45, max = 360) => Math.min(i * step, max);

/** A number that counts up to its new value instead of jumping. */
export function useCountUp(value: number, duration = 900): number {
  const reduce = useReducedMotion();
  const anim = useRef(new Animated.Value(reduceNow ? value : 0)).current;
  const [shown, setShown] = useState(reduceNow ? value : 0);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setShown(v));
    return () => anim.removeListener(id);
  }, [anim]);
  useEffect(() => {
    if (reduce) {
      anim.setValue(value);
      setShown(value);
      return;
    }
    const a = Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [anim, value, duration, reduce]);
  return shown;
}
