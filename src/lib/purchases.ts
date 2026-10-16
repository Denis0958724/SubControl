import { Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { APPLE_SUBSCRIPTIONS_URL, GOOGLE_SUBSCRIPTIONS_URL } from './catalog';
import { formatNumber } from './money';

/**
 * SubControl Pro through App Store and Google Play, via RevenueCat.
 *
 * Store setup (same ids in both stores and in RevenueCat):
 *   subcontrol_pro_monthly  79 ₴ a month, introductory offer 75 ₴ a month for the first 3 months
 *   subcontrol_pro_yearly   690 ₴ a year
 *   entitlement "pro", both products in the current offering as Monthly and Annual packages.
 *
 * The prices on screen come from the store. PRICES below is only what is shown
 * before the store answers and in test builds.
 */
export const ENTITLEMENT = 'pro';

export const PRICES = { monthly: 79, promo: 75, promoMonths: 3, yearly: 690 } as const;

export type PlanId = 'monthly' | 'yearly';

export interface Plan {
  id: PlanId;
  /** regular price, e.g. "79 ₴" */
  price: string;
  /** introductory price while the offer lasts, e.g. "75 ₴" */
  promoPrice?: string;
  promoMonths?: number;
  /** yearly plan in monthly terms, e.g. "57,50 ₴" */
  perMonth?: string;
  /** how much cheaper than paying monthly for a year, in % */
  savePercent?: number;
  pkg?: PurchasesPackage;
}

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

/**
 * store: real purchases.
 * test:  development and test builds without store keys; Pro switches on for free.
 * off:   a release build without keys. Nothing can be bought, and nothing is given away.
 */
export const BILLING: 'store' | 'test' | 'off' =
  Platform.OS !== 'web' && API_KEY
    ? 'store'
    : __DEV__ || process.env.EXPO_PUBLIC_TEST_PRO === '1' || process.env.EXPO_PUBLIC_PREVIEW === '1'
      ? 'test'
      : 'off';

const uah = (n: number) => `${formatNumber(n, Number.isInteger(n) ? 0 : 2)} ₴`;

function savePercent(monthly: number, yearly: number) {
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}

export function fallbackPlans(): Plan[] {
  return [
    {
      id: 'monthly',
      price: uah(PRICES.monthly),
      promoPrice: uah(PRICES.promo),
      promoMonths: PRICES.promoMonths,
    },
    {
      id: 'yearly',
      price: uah(PRICES.yearly),
      perMonth: uah(Math.round((PRICES.yearly / 12) * 100) / 100),
      savePercent: savePercent(PRICES.monthly, PRICES.yearly),
    },
  ];
}

const hasPro = (info: CustomerInfo) => info.entitlements.active[ENTITLEMENT] !== undefined;

let configured = false;

/** Connects to the store once and keeps Pro in sync: renewals, refunds, cancellations. */
export function initPurchases(onChange: (isPro: boolean) => void) {
  if (BILLING !== 'store' || configured) return;
  configured = true;
  Purchases.configure({ apiKey: API_KEY! });
  Purchases.addCustomerInfoUpdateListener((info) => onChange(hasPro(info)));
  Purchases.getCustomerInfo()
    .then((info) => onChange(hasPro(info)))
    .catch(() => {});
}

/** Plans with the store's real prices. An empty list means the store did not answer. */
export async function loadPlans(): Promise<Plan[]> {
  if (BILLING !== 'store') return fallbackPlans();
  try {
    const offering = (await Purchases.getOfferings()).current;
    const monthly = offering?.monthly;
    const yearly = offering?.annual;
    const plans: Plan[] = [];
    if (monthly) {
      const intro = monthly.product.introPrice;
      const promo = intro && intro.price > 0 && intro.price < monthly.product.price && intro.periodUnit === 'MONTH';
      plans.push({
        id: 'monthly',
        price: monthly.product.priceString,
        promoPrice: promo ? intro.priceString : undefined,
        promoMonths: promo ? intro.cycles * intro.periodNumberOfUnits : undefined,
        pkg: monthly,
      });
    }
    if (yearly) {
      plans.push({
        id: 'yearly',
        price: yearly.product.priceString,
        perMonth: yearly.product.pricePerMonthString ?? undefined,
        savePercent: monthly ? savePercent(monthly.product.price, yearly.product.price) : undefined,
        pkg: yearly,
      });
    }
    return plans;
  } catch {
    return [];
  }
}

export type PurchaseResult = 'pro' | 'test' | 'cancelled' | 'off';

export class PurchaseError extends Error {}

export async function purchase(plan: Plan): Promise<PurchaseResult> {
  if (BILLING === 'test') return 'test';
  if (BILLING === 'off' || !plan.pkg) return 'off';
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    if (hasPro(customerInfo)) return 'pro';
    throw new PurchaseError('Оплата пройшла, але Pro ще не активувався. Натисніть «Відновити покупки» за хвилину.');
  } catch (e) {
    if (e instanceof PurchaseError) throw e;
    const err = e as { code?: string; userCancelled?: boolean | null };
    if (err.userCancelled || err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    if (err.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      throw new PurchaseError('Оплата ще обробляється. Pro увімкнеться, щойно магазин її підтвердить.');
    }
    if (err.code === PURCHASES_ERROR_CODE.NETWORK_ERROR) {
      throw new PurchaseError('Немає звʼязку з магазином. Перевірте інтернет і спробуйте ще раз.');
    }
    throw new PurchaseError('Магазин не провів оплату. Гроші не списано. Спробуйте ще раз трохи згодом.');
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (BILLING !== 'store') return false;
  return hasPro(await Purchases.restorePurchases());
}

/** Where to change or cancel Pro itself. */
export async function manageSubscriptionUrl(): Promise<string> {
  const fallback = Platform.OS === 'android' ? GOOGLE_SUBSCRIPTIONS_URL : APPLE_SUBSCRIPTIONS_URL;
  if (BILLING !== 'store') return fallback;
  try {
    return (await Purchases.getCustomerInfo()).managementURL ?? fallback;
  } catch {
    return fallback;
  }
}
