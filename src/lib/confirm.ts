import { Alert, Platform } from 'react-native';

/** Yes/no question that works on phones and in the browser preview. */
export function confirm(title: string, message: string, okLabel = 'Так', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') {
    // The shared browser preview runs where dialogs are blocked; it only holds sample data.
    if (process.env.EXPO_PUBLIC_PREVIEW === '1') return Promise.resolve(true);
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Ні', style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

export function inform(title: string, message: string): void {
  if (Platform.OS === 'web') {
    globalThis.alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
