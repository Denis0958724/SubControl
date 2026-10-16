import { Platform } from 'react-native';

/** Standard licence terms of each store. SubControl has no terms of its own. */
export const TERMS_URL =
  Platform.OS === 'android'
    ? 'https://play.google.com/about/play-terms/'
    : 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/**
 * Where people can write about privacy or problems.
 * Fill in before publishing: the stores ask for a contact too.
 */
export const CONTACT_EMAIL = '';
