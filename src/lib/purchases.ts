/**
 * SubControl Pro — 79 ₴ per month.
 *
 * App Store and Google Play require digital subscriptions to be sold through their own
 * in-app purchase systems. The plan is to connect RevenueCat (react-native-purchases),
 * which handles both stores, receipts and the "restore purchases" flow.
 *
 * Until store products exist, purchase() turns Pro on locally so the paid features
 * can be tried in development builds and the web preview.
 */
export const PRO_PRICE_LABEL = '79 ₴';
export const PRO_PRODUCT_ID = 'subcontrol_pro_monthly';

export const PURCHASES_CONNECTED = false;

export async function purchasePro(): Promise<boolean> {
  return true;
}

export async function restorePurchases(): Promise<boolean> {
  return false;
}
