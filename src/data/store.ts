import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, currentMonth, todayISO } from './dates';
import { round2, uid } from './format';
import { buildStarter, TemplateId } from './templates';
import {
  Budget, BudgetItem, Debt, Fund, Goal, Group, IconKey, ID, IncomeLine, NetEntry, NetSnapshot, PlanId, Reminder, Settings, Tx,
} from './types';

export type State = {
  hydrated: boolean;
  onboarded: boolean;
  isPremium: boolean;
  plan: PlanId | null;
  hasPurchased: boolean;
  trialEnds: string | null;
  budgets: Record<string, Budget>;
  txs: Tx[];
  funds: Fund[];
  debts: Debt[];
  netEntries: NetEntry[];
  netHistory: NetSnapshot[];
  billsPaid: Record<string, boolean>; // `${month}:${itemId}`
  activity: string[]; // dates with at least one logged transaction
  dismissedTips: string[];
  readArticles: string[];
  settings: Settings;
};

type Actions = {
  setHydrated: () => void;
  completeOnboarding: (p: { name: string; goals: Goal[]; monthlyIncome: number; template: TemplateId; payDay: number; reminders: Reminder[] }) => void;
  ensureBudget: (month: string) => void;
  copyBudgetFrom: (from: string, to: string) => void;
  setPlanned: (month: string, itemId: ID, planned: number) => void;
  addItem: (month: string, groupId: ID, item: Omit<BudgetItem, 'id'>) => ID;
  updateItem: (month: string, itemId: ID, patch: Partial<Omit<BudgetItem, 'id'>>) => void;
  removeItem: (month: string, itemId: ID) => void;
  addGroup: (month: string, name: string, icon: IconKey) => ID;
  updateGroup: (month: string, groupId: ID, patch: { name?: string; icon?: IconKey }) => void;
  removeGroup: (month: string, groupId: ID) => void;
  addIncome: (month: string, line: Omit<IncomeLine, 'id'>) => ID;
  updateIncome: (month: string, id: ID, patch: Partial<Omit<IncomeLine, 'id'>>) => void;
  removeIncome: (month: string, id: ID) => void;
  addTx: (tx: Omit<Tx, 'id'>) => { id: ID; streakExtended: boolean; streak: number };
  updateTx: (id: ID, tx: Omit<Tx, 'id'>) => void;
  removeTx: (id: ID) => void;
  addFund: (f: Omit<Fund, 'id'>) => ID;
  updateFund: (id: ID, patch: Partial<Omit<Fund, 'id'>>) => void;
  removeFund: (id: ID) => void;
  addDebt: (d: Omit<Debt, 'id'>) => ID;
  updateDebt: (id: ID, patch: Partial<Omit<Debt, 'id'>>) => void;
  removeDebt: (id: ID) => void;
  addNetEntry: (e: Omit<NetEntry, 'id'>) => ID;
  updateNetEntry: (id: ID, patch: Partial<Omit<NetEntry, 'id'>>) => void;
  removeNetEntry: (id: ID) => void;
  togglePaid: (month: string, itemId: ID) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setReminders: (r: Reminder[]) => void;
  dismissTip: (id: string) => void;
  markRead: (id: string) => void;
  purchase: (plan: PlanId) => void;
  restore: () => boolean;
  cancelPremium: () => void;
  resetAll: () => void;
};

export const defaultReminders = (): Reminder[] => [
  { id: 'rem_evening', label: 'Log today’s spending', hour: 20, minute: 0, enabled: true },
];

const initial = (): State => ({
  hydrated: false,
  onboarded: false,
  isPremium: false,
  plan: null,
  hasPurchased: false,
  trialEnds: null,
  budgets: {},
  txs: [],
  funds: [],
  debts: [],
  netEntries: [],
  netHistory: [],
  billsPaid: {},
  activity: [],
  dismissedTips: [],
  readArticles: [],
  settings: { theme: 'system', reminders: defaultReminders(), haptics: true, billReminders: true, coachConsent: false, goals: [], name: '' },
});

/** Consecutive-day streak ending today or yesterday. */
export function computeStreak(activity: string[]): number {
  const set = new Set(activity);
  let day = todayISO();
  if (!set.has(day)) day = addDays(day, -1);
  let n = 0;
  while (set.has(day)) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

const mapBudget = (s: State, month: string, fn: (b: Budget) => Budget): Pick<State, 'budgets'> => {
  const b = s.budgets[month];
  return b ? { budgets: { ...s.budgets, [month]: fn(b) } } : { budgets: s.budgets };
};

function snapshot(history: NetSnapshot[], entries: NetEntry[]): NetSnapshot[] {
  const assets = round2(entries.filter((e) => e.kind === 'asset').reduce((a, e) => a + e.amount, 0));
  const liabilities = round2(entries.filter((e) => e.kind === 'liability').reduce((a, e) => a + e.amount, 0));
  const date = todayISO();
  const rest = history.filter((h) => h.date !== date);
  return [...rest, { date, assets, liabilities }].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-120);
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial(),
      setHydrated: () => set({ hydrated: true }),

      completeOnboarding: ({ name, goals, monthlyIncome, template, payDay, reminders }) => {
        const month = currentMonth();
        const { budget, funds } = buildStarter(month, monthlyIncome, template, 'Paycheck', payDay);
        set((s) => ({
          onboarded: true,
          budgets: { ...s.budgets, [month]: budget },
          funds: [...s.funds, ...funds],
          settings: { ...s.settings, name, goals, reminders },
        }));
      },

      ensureBudget: (month) => {
        const s = get();
        if (s.budgets[month]) return;
        // Carry the most recent earlier budget forward so a new month is never a blank page.
        const keys = Object.keys(s.budgets).sort();
        const prev = [...keys].reverse().find((k) => k < month);
        if (prev) get().copyBudgetFrom(prev, month);
        else set((st) => ({ budgets: { ...st.budgets, [month]: { month, incomes: [], groups: [] } } }));
      },
      copyBudgetFrom: (from, to) =>
        set((s) => {
          const src = s.budgets[from];
          if (!src) return {};
          const copy: Budget = {
            month: to,
            incomes: src.incomes.map((i) => ({ ...i })),
            groups: src.groups.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i })) })),
          };
          return { budgets: { ...s.budgets, [to]: copy } };
        }),

      setPlanned: (month, itemId, planned) =>
        set((s) =>
          mapBudget(s, month, (b) => ({
            ...b,
            groups: b.groups.map((g) => ({ ...g, items: g.items.map((i) => (i.id === itemId ? { ...i, planned: round2(planned) } : i)) })),
          })),
        ),
      addItem: (month, groupId, item) => {
        const id = uid('itm');
        set((s) => mapBudget(s, month, (b) => ({ ...b, groups: b.groups.map((g) => (g.id === groupId ? { ...g, items: [...g.items, { ...item, id }] } : g)) })));
        return id;
      },
      updateItem: (month, itemId, patch) =>
        set((s) =>
          mapBudget(s, month, (b) => ({
            ...b,
            groups: b.groups.map((g) => ({ ...g, items: g.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) })),
          })),
        ),
      removeItem: (month, itemId) =>
        set((s) => mapBudget(s, month, (b) => ({ ...b, groups: b.groups.map((g) => ({ ...g, items: g.items.filter((i) => i.id !== itemId) })) }))),
      addGroup: (month, name, icon) => {
        const id = uid('grp');
        set((s) => mapBudget(s, month, (b) => ({ ...b, groups: [...b.groups, { id, name, icon, items: [] } as Group] })));
        return id;
      },
      updateGroup: (month, groupId, patch) =>
        set((s) => mapBudget(s, month, (b) => ({ ...b, groups: b.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)) }))),
      removeGroup: (month, groupId) => set((s) => mapBudget(s, month, (b) => ({ ...b, groups: b.groups.filter((g) => g.id !== groupId) }))),
      addIncome: (month, line) => {
        const id = uid('inc');
        set((s) => mapBudget(s, month, (b) => ({ ...b, incomes: [...b.incomes, { ...line, id }] })));
        return id;
      },
      updateIncome: (month, id, patch) =>
        set((s) => mapBudget(s, month, (b) => ({ ...b, incomes: b.incomes.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))),
      removeIncome: (month, id) => set((s) => mapBudget(s, month, (b) => ({ ...b, incomes: b.incomes.filter((i) => i.id !== id) }))),

      addTx: (tx) => {
        const id = uid('tx');
        const before = computeStreak(get().activity);
        set((s) => ({
          txs: [{ ...tx, id }, ...s.txs],
          activity: s.activity.includes(todayISO()) ? s.activity : [...s.activity, todayISO()],
        }));
        const after = computeStreak(get().activity);
        return { id, streakExtended: after > before, streak: after };
      },
      updateTx: (id, tx) => set((s) => ({ txs: s.txs.map((t) => (t.id === id ? { ...tx, id } : t)) })),
      removeTx: (id) => set((s) => ({ txs: s.txs.filter((t) => t.id !== id) })),

      addFund: (f) => {
        const id = uid('fnd');
        set((s) => ({ funds: [...s.funds, { ...f, id }] }));
        return id;
      },
      updateFund: (id, patch) => set((s) => ({ funds: s.funds.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
      removeFund: (id) =>
        set((s) => ({
          funds: s.funds.filter((f) => f.id !== id),
          budgets: Object.fromEntries(
            Object.entries(s.budgets).map(([k, b]) => [
              k,
              { ...b, groups: b.groups.map((g) => ({ ...g, items: g.items.map((i) => (i.fundId === id ? { ...i, fundId: undefined } : i)) })) },
            ]),
          ),
        })),

      addDebt: (d) => {
        const id = uid('dbt');
        set((s) => ({ debts: [...s.debts, { ...d, id }] }));
        return id;
      },
      updateDebt: (id, patch) => set((s) => ({ debts: s.debts.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      removeDebt: (id) => set((s) => ({ debts: s.debts.filter((d) => d.id !== id) })),

      addNetEntry: (e) => {
        const id = uid('net');
        set((s) => {
          const entries = [...s.netEntries, { ...e, id }];
          return { netEntries: entries, netHistory: snapshot(s.netHistory, entries) };
        });
        return id;
      },
      updateNetEntry: (id, patch) =>
        set((s) => {
          const entries = s.netEntries.map((e) => (e.id === id ? { ...e, ...patch } : e));
          return { netEntries: entries, netHistory: snapshot(s.netHistory, entries) };
        }),
      removeNetEntry: (id) =>
        set((s) => {
          const entries = s.netEntries.filter((e) => e.id !== id);
          return { netEntries: entries, netHistory: snapshot(s.netHistory, entries) };
        }),

      togglePaid: (month, itemId) =>
        set((s) => {
          const key = `${month}:${itemId}`;
          const next = { ...s.billsPaid };
          if (next[key]) delete next[key];
          else next[key] = true;
          return { billsPaid: next };
        }),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setReminders: (reminders) => set((s) => ({ settings: { ...s.settings, reminders } })),
      dismissTip: (id) => set((s) => (s.dismissedTips.includes(id) ? {} : { dismissedTips: [...s.dismissedTips, id] })),
      markRead: (id) => set((s) => (s.readArticles.includes(id) ? {} : { readArticles: [...s.readArticles, id] })),

      // Purchases are mocked: no payment SDK, the flag simply unlocks everything.
      purchase: (plan) => set({ isPremium: true, plan, hasPurchased: true, trialEnds: addDays(todayISO(), plan === 'yearly' ? 7 : 3) }),
      restore: () => {
        if (!get().hasPurchased) return false;
        set({ isPremium: true });
        return true;
      },
      cancelPremium: () => set({ isPremium: false, plan: null, trialEnds: null }),

      resetAll: () => set({ ...initial(), hydrated: true }),
    }),
    {
      name: 'allot.v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => {
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(s)) if (typeof v !== 'function' && k !== 'hydrated') data[k] = v;
        return data as unknown as State & Actions;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
