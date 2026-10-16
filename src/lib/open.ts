import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

/** Opens a service's page: in-app browser on phones, a new tab on the web. */
export function openExternal(url: string): void {
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
}
