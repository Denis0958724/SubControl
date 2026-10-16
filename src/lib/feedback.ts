import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useStore } from '../store';

/**
 * Quiet interface sounds plus a light vibration.
 * Sounds respect the silent switch on iPhone and silent or vibrate mode on Android,
 * and they mix with music instead of pausing it. They can be switched off in settings.
 */
export type Sound = 'tap' | 'on' | 'off' | 'success' | 'cancel' | 'found';

const SOURCES: Record<Sound, number> = {
  tap: require('../../assets/sounds/tap.wav'),
  on: require('../../assets/sounds/on.wav'),
  off: require('../../assets/sounds/off.wav'),
  success: require('../../assets/sounds/success.wav'),
  cancel: require('../../assets/sounds/cancel.wav'),
  found: require('../../assets/sounds/found.wav'),
};

/** Taps are frequent, so they stay quieter than the rest. */
const VOLUME: Record<Sound, number> = { tap: 0.35, on: 0.5, off: 0.45, success: 0.6, cancel: 0.55, found: 0.6 };

const players: Partial<Record<Sound, AudioPlayer>> = {};
let ready: Promise<void> | null = null;

function prepare(): Promise<void> {
  if (!ready) {
    ready = setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    }).catch(() => {});
  }
  return ready;
}

function player(sound: Sound): AudioPlayer | null {
  try {
    let p = players[sound];
    if (!p) {
      p = createAudioPlayer(SOURCES[sound]);
      p.volume = VOLUME[sound];
      players[sound] = p;
    }
    return p;
  } catch {
    return null;
  }
}

/** Load the sounds ahead of time so the first tap is not late. */
export function preloadSounds() {
  prepare().then(() => (Object.keys(SOURCES) as Sound[]).forEach(player));
}

export function play(sound: Sound) {
  if (!useStore.getState().settings.sounds) return;
  prepare().then(() => {
    const p = player(sound);
    if (!p) return;
    const start = () => {
      try {
        p.play();
      } catch {
        // a missing sound is never worth an error
      }
    };
    // a sound that already played sits at its end; rewind first
    if (p.currentTime > 0) p.seekTo(0).then(start, start);
    else start();
  });
}

const HAPTIC: Partial<Record<Sound, () => Promise<void>>> = {
  tap: () => Haptics.selectionAsync(),
  on: () => Haptics.selectionAsync(),
  off: () => Haptics.selectionAsync(),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  found: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  cancel: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
};

/** Sound and vibration together. */
export function feedback(sound: Sound) {
  if (Platform.OS !== 'web') HAPTIC[sound]?.().catch(() => {});
  play(sound);
}

/** Every button and row press. */
export const tap = () => feedback('tap');
