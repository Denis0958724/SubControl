import { Platform } from 'react-native';

/** Standard licence terms of each store. SubControl has no terms of its own. */
export const TERMS_URL =
  Platform.OS === 'android'
    ? 'https://play.google.com/about/play-terms/'
    : 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** Public site on GitHub Pages: home, support and privacy policy for the store listings. */
export const SITE_URL = 'https://denis0958724.github.io/SubControl/';
export const SUPPORT_URL = `${SITE_URL}support.html`;
export const PRIVACY_URL = `${SITE_URL}privacy.html`;

/**
 * Where people can write about privacy or problems.
 * Fill in before publishing: the stores ask for a contact too.
 * The site picks it up from here on the next publish.
 */
export const CONTACT_EMAIL = '';

/**
 * Which store this copy of the app came from. Apple rejects apps that mention other platforms
 * (guideline 2.3.10), so on a phone the texts only ever name their own store.
 * The web preview shows both, unless localStorage "subcontrol:store" says "ios" or "android" (for store screenshots).
 */
export type StoreKind = 'ios' | 'android' | 'both';

function previewStore(): StoreKind {
  try {
    const ls = (globalThis as { localStorage?: { getItem: (k: string) => string | null } }).localStorage;
    const s = ls?.getItem('subcontrol:store');
    return s === 'ios' || s === 'android' ? s : 'both';
  } catch {
    return 'both';
  }
}

export const STORE: StoreKind = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : previewStore();

export const STORE_NAME = STORE === 'android' ? 'Google Play' : STORE === 'ios' ? 'App Store' : 'App Store чи Google Play';
