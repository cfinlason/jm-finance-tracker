import { Budget, Fund, Goal, Group, IconKey } from './types';
import { uid } from './format';

type Line = { name: string; pct: number; icon?: IconKey; fund?: boolean; due?: number };
type GroupDef = { name: string; icon: IconKey; lines: Line[] };

export type TemplateId = 'balanced' | 'debt' | 'saver' | 'blank';

export const TEMPLATES: { id: TemplateId; title: string; blurb: string; icon: IconKey; groups: GroupDef[] }[] = [
  {
    id: 'balanced',
    title: 'Balanced',
    blurb: 'A calm, all-purpose plan: bills covered, a little fun, steady savings.',
    icon: 'target',
    groups: [
      { name: 'Housing', icon: 'home', lines: [{ name: 'Rent or mortgage', pct: 0.3, due: 1 }, { name: 'Electric & water', pct: 0.05, due: 15 }, { name: 'Internet & phone', pct: 0.03, due: 20 }] },
      { name: 'Food', icon: 'cart', lines: [{ name: 'Groceries', pct: 0.12 }, { name: 'Eating out', pct: 0.05, icon: 'food' }] },
      { name: 'Transportation', icon: 'car', lines: [{ name: 'Gas & transit', pct: 0.06 }, { name: 'Car insurance', pct: 0.04, due: 10 }] },
      { name: 'Health', icon: 'health', lines: [{ name: 'Insurance & medical', pct: 0.04 }] },
      { name: 'Lifestyle', icon: 'sparkles', lines: [{ name: 'Subscriptions', pct: 0.02, due: 5 }, { name: 'Fun money', pct: 0.05 }, { name: 'Personal care', pct: 0.02 }] },
      { name: 'Savings', icon: 'piggy', lines: [{ name: 'Emergency fund', pct: 0.1, fund: true }, { name: 'Vacation fund', pct: 0.04, fund: true, icon: 'plane' }, { name: 'Buffer', pct: 0 }] },
    ],
  },
  {
    id: 'debt',
    title: 'Debt crusher',
    blurb: 'Lean on the extras, throw the difference at what you owe.',
    icon: 'flame',
    groups: [
      { name: 'Housing', icon: 'home', lines: [{ name: 'Rent or mortgage', pct: 0.3, due: 1 }, { name: 'Utilities', pct: 0.06, due: 15 }] },
      { name: 'Food', icon: 'cart', lines: [{ name: 'Groceries', pct: 0.11 }, { name: 'Eating out', pct: 0.02, icon: 'food' }] },
      { name: 'Transportation', icon: 'car', lines: [{ name: 'Gas & transit', pct: 0.06 }, { name: 'Car insurance', pct: 0.04, due: 10 }] },
      { name: 'Lifestyle', icon: 'sparkles', lines: [{ name: 'Basics', pct: 0.03 }, { name: 'Fun money', pct: 0.02 }] },
      { name: 'Debt', icon: 'card', lines: [{ name: 'Minimum payments', pct: 0.14, due: 12 }, { name: 'Extra debt payment', pct: 0.2 }] },
      { name: 'Savings', icon: 'piggy', lines: [{ name: 'Starter emergency fund', pct: 0.02, fund: true }, { name: 'Buffer', pct: 0 }] },
    ],
  },
  {
    id: 'saver',
    title: 'Super saver',
    blurb: 'Pay your future self first and still enjoy the month.',
    icon: 'sprout',
    groups: [
      { name: 'Housing', icon: 'home', lines: [{ name: 'Rent or mortgage', pct: 0.28, due: 1 }, { name: 'Utilities', pct: 0.05, due: 15 }] },
      { name: 'Food', icon: 'cart', lines: [{ name: 'Groceries', pct: 0.1 }, { name: 'Eating out', pct: 0.03, icon: 'food' }] },
      { name: 'Transportation', icon: 'car', lines: [{ name: 'Gas & transit', pct: 0.05 }, { name: 'Car insurance', pct: 0.03, due: 10 }] },
      { name: 'Lifestyle', icon: 'sparkles', lines: [{ name: 'Subscriptions', pct: 0.02, due: 5 }, { name: 'Fun money', pct: 0.04 }] },
      { name: 'Savings', icon: 'piggy', lines: [{ name: 'Emergency fund', pct: 0.15, fund: true }, { name: 'Big purchase fund', pct: 0.1, fund: true, icon: 'gem' }, { name: 'Investing', pct: 0.12, icon: 'trend' }, { name: 'Buffer', pct: 0.03 }] },
    ],
  },
  { id: 'blank', title: 'Start blank', blurb: 'Build every line yourself. Nothing pre-filled.', icon: 'sparkles', groups: [] },
];

const roundTo5 = (n: number) => Math.max(0, Math.round(n / 5) * 5);

export function buildStarter(month: string, monthlyIncome: number, templateId: TemplateId, incomeName = 'Paycheck', payDay = 1): { budget: Budget; funds: Fund[] } {
  const tpl = TEMPLATES.find((t) => t.id === templateId)!;
  const funds: Fund[] = [];
  const groups: Group[] = tpl.groups.map((g) => ({
    id: uid('grp'),
    name: g.name,
    icon: g.icon,
    items: g.lines.map((l) => {
      const item = { id: uid('itm'), name: l.name, planned: roundTo5(monthlyIncome * l.pct), dueDay: l.due } as Group['items'][number];
      if (l.fund) {
        const fund: Fund = {
          id: uid('fnd'),
          name: l.name,
          icon: l.icon ?? 'piggy',
          goal: Math.max(500, roundTo5(monthlyIncome * (l.name.startsWith('Emergency') ? 3 : 1))),
          opening: 0,
        };
        funds.push(fund);
        item.fundId = fund.id;
      }
      return item;
    }),
  }));
  // Zero-based: any rounding remainder lands in "Buffer" (or the last line) so every dollar has a job.
  if (groups.length) {
    const planned = groups.reduce((s, g) => s + g.items.reduce((a, i) => a + i.planned, 0), 0);
    const rest = Math.round((monthlyIncome - planned) * 100) / 100;
    const lastGroup = groups[groups.length - 1];
    const buffer = groups.flatMap((g) => g.items).find((i) => i.name === 'Buffer') ?? lastGroup.items[lastGroup.items.length - 1];
    if (buffer) buffer.planned = Math.max(0, Math.round((buffer.planned + rest) * 100) / 100);
  }
  return {
    budget: { month, incomes: [{ id: uid('inc'), name: incomeName, planned: monthlyIncome, payDay }], groups },
    funds,
  };
}

export const GOAL_OPTIONS: { id: Goal; title: string; blurb: string; icon: IconKey }[] = [
  { id: 'save', title: 'Save more', blurb: 'Build a cushion and fund the things I want', icon: 'piggy' },
  { id: 'debt', title: 'Pay off debt', blurb: 'A clear plan to get to zero', icon: 'flame' },
  { id: 'paycheck', title: 'Stretch my paycheck', blurb: 'Stop wondering where it went', icon: 'wallet' },
  { id: 'family', title: 'Budget together', blurb: 'One plan for the whole household', icon: 'baby' },
  { id: 'track', title: 'Just track spending', blurb: 'Keep it light and see the picture', icon: 'receipt' },
];
