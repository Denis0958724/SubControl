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
