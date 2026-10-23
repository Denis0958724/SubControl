import { create } from 'zustand';

import type { IconName } from '../components/Icon';

/**
 * Short messages at the top of the screen: "added", "cancelled", "deleted, undo?".
 * Lives outside the persisted store: nothing here should survive a restart.
 */
export type ToastTone = 'default' | 'success' | 'saved';

export interface Toast {
  id: number;
  title: string;
  text?: string;
  tone: ToastTone;
  icon?: IconName;
  action?: { label: string; run: () => void };
}

interface ToastState {
  current: Toast | null;
  /** bumps every time a confetti burst is wanted */
  confetti: number;
  hide: (id?: number) => void;
}

let seq = 0;

export const useToast = create<ToastState>()((set, get) => ({
  current: null,
  confetti: 0,
  hide: (id) => {
    const cur = get().current;
    if (cur && (id === undefined || cur.id === id)) set({ current: null });
  },
}));

export function toast(t: Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone }): void {
  seq += 1;
  useToast.setState({ current: { tone: 'default', ...t, id: seq } });
}

/** A small burst of confetti over everything. For money saved, not for every tap. */
export function celebrate(): void {
  useToast.setState((s) => ({ confetti: s.confetti + 1 }));
}
