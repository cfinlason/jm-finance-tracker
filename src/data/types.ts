export type ID = string;

export type IconKey =
  | 'home' | 'zap' | 'cart' | 'car' | 'food' | 'health' | 'shield' | 'phone' | 'tv' | 'gift' | 'piggy' | 'plane'
  | 'school' | 'baby' | 'paw' | 'wallet' | 'cash' | 'trend' | 'card' | 'bank' | 'coffee' | 'shirt' | 'wrench'
  | 'sparkles' | 'music' | 'book' | 'flame' | 'fuel' | 'dumbbell' | 'scissors' | 'party' | 'umbrella' | 'gem'
  | 'sprout' | 'coins' | 'target' | 'receipt';

export type IncomeLine = { id: ID; name: string; planned: number; payDay?: number };
export type BudgetItem = { id: ID; name: string; planned: number; fundId?: ID; dueDay?: number };
export type Group = { id: ID; name: string; icon: IconKey; items: BudgetItem[] };
export type Budget = { month: string; incomes: IncomeLine[]; groups: Group[] };

export type Split = { id: ID; amount: number };
export type TxKind = 'expense' | 'income' | 'fund_spend' | 'fund_deposit';
export type Tx = {
  id: ID;
  date: string; // YYYY-MM-DD (local)
  kind: TxKind;
  merchant: string;
  note?: string;
  amount: number;
  splits: Split[]; // expense → item ids, income → income ids, fund_* → fund id
};

export type Fund = { id: ID; name: string; icon: IconKey; goal: number; opening: number; targetDate?: string };
export type Debt = { id: ID; name: string; balance: number; apr: number; minPayment: number };
export type NetEntry = { id: ID; name: string; kind: 'asset' | 'liability'; amount: number };
export type NetSnapshot = { date: string; assets: number; liabilities: number };
export type Reminder = { id: ID; label: string; hour: number; minute: number; enabled: boolean };

export type Goal = 'save' | 'debt' | 'paycheck' | 'family' | 'track';
export type PlanId = 'weekly' | 'yearly';
export type ThemePref = 'system' | 'light' | 'dark';

export type Settings = {
  theme: ThemePref;
  reminders: Reminder[];
  haptics: boolean;
  billReminders: boolean;
  coachConsent: boolean;
  goals: Goal[];
  name: string;
};
