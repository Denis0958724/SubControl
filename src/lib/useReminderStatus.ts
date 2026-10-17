import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { exactAlarmsAllowed, permissionState, type PermissionState } from './notifications';

export interface ReminderStatus {
  /** can SubControl show notifications at all */
  permission: PermissionState;
  /** Android: may reminders fire at the exact minute */
  exact: boolean;
  refresh: () => void;
}

/** Re-checks every time the app comes back, since people fix this in system settings. */
export function useReminderStatus(): ReminderStatus {
  const [permission, setPermission] = useState<PermissionState>('granted');
  const [exact, setExact] = useState(true);

  const refresh = useCallback(() => {
    if (Platform.OS === 'web') return;
    permissionState().then(setPermission).catch(() => {});
    exactAlarmsAllowed().then(setExact).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  return { permission, exact, refresh };
}
