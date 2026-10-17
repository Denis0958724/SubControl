import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { colorForName, findService } from './lib/catalog';
import { fromISO, rollForward, todayISO } from './lib/dates';
import { FALLBACK_RATES } from './lib/money';
import type { ISODate, Rates, Settings, Subscription } from './lib/types';

/** How many active subscriptions the free version tracks. */
export const FREE_LIMIT = 7;

export type NewSubscription = Omit<
  Subscription,
  'id' | 'createdAt' | 'status' | 'anchorDay' | 'color' | 'cancelledAt'
> & { color?: string };

interface State {
  subs: Subscription[];
  settings: Settings;
  rates: Rates;
  isPro: boolean;
  monoConnected: boolean;
  /** charges the person already answered "Продовжую" to: subscription id → that charge date */
  acknowledged: Record<string, ISODate>;
  hydrated: boolean;

  add: (sub: NewSubscription) => string;
  update: (id: string, patch: Partial<Subscription>) => void;
  remove: (id: string) => void;
  cancel: (id: string) => void;
  restore: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setRates: (rates: Rates) => void;
  setPro: (isPro: boolean) => void;
  setMonoConnected: (connected: boolean) => void;
  acknowledge: (id: string) => void;
  resetAll: () => void;
  rollDates: () => void;
}

const DEFAULT_SETTINGS: Settings = { leadDays: 1, hour: 12, sounds: true, dayOf: true, loud: true, liveActivity: true };

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      subs: [],
      settings: DEFAULT_SETTINGS,
      rates: FALLBACK_RATES,
      isPro: false,
      monoConnected: false,
      acknowledged: {},
      hydrated: false,

      add: (sub) => {
        const id = newId();
        const color = sub.color ?? findService(sub.serviceId)?.color ?? colorForName(sub.name);
        const created: Subscription = {
          ...sub,
          id,
          color,
          anchorDay: fromISO(sub.nextCharge).getDate(),
          status: 'active',
          createdAt: todayISO(),
        };
        set({ subs: [...get().subs, created] });
        return id;
      },

      update: (id, patch) =>
        set({
          subs: get().subs.map((s) => {
            if (s.id !== id) return s;
            const next = { ...s, ...patch };
            if (patch.nextCharge) next.anchorDay = fromISO(patch.nextCharge).getDate();
            return next;
          }),
        }),

      remove: (id) => set({ subs: get().subs.filter((s) => s.id !== id) }),

      cancel: (id) =>
        set({
          subs: get().subs.map((s) =>
            s.id === id ? { ...s, status: 'cancelled', cancelledAt: todayISO(), remind: false } : s,
          ),
        }),

      restore: (id) => {
        const today = todayISO();
        set({
          subs: get().subs.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'active',
                  cancelledAt: undefined,
                  remind: true,
                  nextCharge: rollForward(s.nextCharge, s.cycle, s.anchorDay, today),
                }
              : s,
          ),
        });
      },

      setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      setRates: (rates) => set({ rates }),
      setPro: (isPro) => set({ isPro }),
      setMonoConnected: (monoConnected) => set({ monoConnected }),

      acknowledge: (id) => {
        const sub = get().subs.find((s) => s.id === id);
        if (sub) set({ acknowledged: { ...get().acknowledged, [id]: sub.nextCharge } });
      },

      resetAll: () => set({ subs: [], settings: DEFAULT_SETTINGS }),

      /** Charges that already happened move to their next date. */
      rollDates: () => {
        const today = todayISO();
        let changed = false;
        const subs = get().subs.map((s) => {
          if (s.status !== 'active' || s.nextCharge >= today) return s;
          changed = true;
          return { ...s, nextCharge: rollForward(s.nextCharge, s.cycle, s.anchorDay, today) };
        });
        if (changed) set({ subs });
      },
    }),
    {
      name: 'subcontrol',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // settings added in later versions get their defaults instead of disappearing
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<State>;
        return { ...current, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings } };
      },
      partialize: ({ subs, settings, rates, isPro, monoConnected, acknowledged }) => ({
        acknowledged,
        subs,
        settings,
        rates,
        isPro,
        monoConnected,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
        useStore.getState().rollDates();
      },
    },
  ),
);

export const activeSubs = (subs: Subscription[]) => subs.filter((s) => s.status === 'active');

export function canAddMore(state: Pick<State, 'isPro' | 'subs'>): boolean {
  return state.isPro || activeSubs(state.subs).length < FREE_LIMIT;
}
