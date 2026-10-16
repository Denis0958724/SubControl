export type ISODate = string; // YYYY-MM-DD, local date

export type Cycle = 'week' | 'month' | 'year';
export type Currency = 'UAH' | 'USD' | 'EUR';

export interface Subscription {
  id: string;
  /** id from the services catalog, if the subscription is a known service */
  serviceId?: string;
  name: string;
  /** price per billing cycle, in `currency` */
  amount: number;
  currency: Currency;
  cycle: Cycle;
  /** next expected charge */
  nextCharge: ISODate;
  /** day of month the charge is anchored to (keeps 31st on the 31st when possible) */
  anchorDay: number;
  color: string;
  remind: boolean;
  status: 'active' | 'cancelled';
  /** how many people share the cost (1 = only you) */
  sharedWith: number;
  source: 'manual' | 'monobank';
  createdAt: ISODate;
  cancelledAt?: ISODate;
}

export interface Rates {
  USD: number;
  EUR: number;
  updatedAt: string;
  source: 'monobank' | 'nbu' | 'fallback';
}

export interface Settings {
  /** remind this many days before the charge */
  leadDays: 1 | 3 | 7;
  /** hour of day for reminders, 0–23 */
  hour: number;
}
