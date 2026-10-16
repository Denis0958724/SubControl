import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'monobank_token';
let memoryToken: string | null = null;

/** The monobank token lives in the phone's keychain / keystore, never in plain storage. */
export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryToken = token;
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') return memoryToken;
  return SecureStore.getItemAsync(KEY);
}

export async function forgetToken(): Promise<void> {
  if (Platform.OS === 'web') {
    memoryToken = null;
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
