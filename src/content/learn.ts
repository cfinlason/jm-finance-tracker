import type { IconKey } from '../data/types';

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'tip'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'steps'; items: string[] }
  | { t: 'quote'; text: string };

export type Article = {
  id: string;
  title: string;
  category: 'Start here' | 'Budgeting' | 'Saving' | 'Debt' | 'Life';
  minutes: number;
  icon: IconKey;
  summary: string;
  premium?: boolean;
  blocks: Block[];
};

export const CATEGORIES: Article['category'][] = ['Start here', 'Budgeting', 'Saving', 'Debt', 'Life'];

export const ARTICLES: Article[] = [
  {
    id: 'every-dollar-a-job',
    title: 'Give every dollar a job',
    category: 'Start here',
    minutes: 4,
    icon: 'target',
    summary: 'The one idea behind a budget that actually holds up.',
    blocks: [
      { t: 'p', text: 'Most people budget by looking backward: they spend, then check how it went. A zero-based budget flips that. Before the month starts, you decide what every dollar of income is for. Income minus planned spending equals zero — not because you spend it all, but because nothing is left without a purpose.' },
      { t: 'h', text: 'Why it works' },
      { t: 'p', text: 'A balance in your account feels like permission. A plan turns it into a decision you already made, which is far easier to stick to at the checkout. Saving is a line in the plan, not whatever happens to be left over.' },
      { t: 'h', text: 'How to do it in Allot' },
      { t: 'steps', items: ['Open the Budget tab and look at the banner at the top. It shows how much is still left to budget.', 'Tap any line and give it an amount until the banner reads $0.', 'Log spending as it happens. Each line fills as you go, so you always know what is safe to spend.'] },
      { t: 'tip', text: 'If you land at zero and a line runs short mid-month, move money from another line instead of ignoring it. The plan bends; the total stays honest.' },
      { t: 'h', text: 'What zero is not' },
      { t: 'p', text: 'It is not a diet. Fun money is a perfectly good job for a dollar. The goal is that you chose it, so you can enjoy it without guilt.' },
    ],
  },
  {
    id: 'first-budget',
    title: 'Build your first budget in ten minutes',
    category: 'Start here',
    minutes: 5,
    icon: 'receipt',
    summary: 'A practical walk-through, from income to the last line.',
    blocks: [
      { t: 'p', text: 'You do not need perfect numbers on day one. You need a first draft you will improve for three months. Here is the order that makes it painless.' },
      { t: 'steps', items: ['Start with income. Enter what actually lands in your account, after taxes, for this month.', 'List the non-negotiables: housing, utilities, groceries, transport, insurance, minimum debt payments. Use last month’s statement if you are unsure.', 'Add the goals: an emergency fund, a trip, a big purchase. These become funds so the money stays put until you need it.', 'Add what makes life enjoyable: eating out, hobbies, subscriptions.', 'Adjust until the banner at the top reads zero.'] },
      { t: 'tip', text: 'Your first month will be wrong somewhere. That is the point. Review at the end of the month, adjust, and the second month is already much better.' },
      { t: 'h', text: 'Pick the right starting template' },
      { t: 'list', items: ['Balanced: a steady all-rounder if you are not sure.', 'Debt crusher: trims extras and pushes the difference toward what you owe.', 'Super saver: pays your future self first.', 'Start blank: for people who like to build their own.'] },
    ],
  },
  {
    id: 'funds-explained',
    title: 'Funds, explained: saving without wrecking your month',
    category: 'Saving',
    minutes: 5,
    icon: 'piggy',
    summary: 'Why a fund withdrawal should never make you "overbudget".',
    blocks: [
      { t: 'p', text: 'A fund is a stash of money for something that is not a monthly expense: car repairs, holidays, an annual insurance bill, an emergency. You add to it a bit at a time and spend from it when the need arrives.' },
      { t: 'h', text: 'The rule Allot follows' },
      { t: 'p', text: 'Money you put into a fund is a planned line in your monthly budget. Money you take out of a fund never touches your monthly budget. A $1,000 car repair paid from your car fund lowers the fund, not this month’s grocery money.' },
      { t: 'tip', text: 'Many budgeting apps blur those two things, so a withdrawal looks like overspending. In Allot, funds live in their own lane and your monthly picture stays clean.' },
      { t: 'h', text: 'Sinking fund math' },
      { t: 'p', text: 'Give a fund a goal and a date. Allot divides what is left by the months remaining and tells you the amount to set aside each month. Annual $240 software renewal in 8 months? That is $30 a month. Boring, accurate, and no surprise bill.' },
      { t: 'list', items: ['Set the goal and the target date on the fund.', 'Add the suggested monthly amount to your budget line.', 'Spend from the fund with the "From a fund" option when you log a transaction.'] },
    ],
  },
  {
    id: 'irregular-income',
    title: 'Irregular income? Budget one month behind',
    category: 'Budgeting',
    minutes: 4,
    icon: 'wallet',
    summary: 'A calm way to plan when every paycheck is different.',
    blocks: [
      { t: 'p', text: 'Freelancers, commissioned workers and shift workers share one problem: you cannot plan around a number that keeps moving. The fix is to decouple earning from spending.' },
      { t: 'h', text: 'Live on last month’s income' },
      { t: 'p', text: 'Pick a month and treat it purely as collecting. Everything you earn in it funds the following month. When the next month begins you know exactly how much you have, down to the dollar.' },
      { t: 'h', text: 'Plan against the low end' },
      { t: 'p', text: 'Budget the essentials against your lowest recent month. Anything above that is extra income. Allot shows it as "extra to assign" so you can send it to a fund, a debt, or a want, on purpose.' },
      { t: 'tip', text: 'Log income the day it arrives. If you earn more than planned, the banner tells you right away so the extra dollars get a job before they disappear.' },
      { t: 'h', text: 'Build a small buffer' },
      { t: 'p', text: 'A "short month" fund of one extra paycheck smooths out the lean stretches. Top it up in good months and let it cover bad ones.' },
    ],
  },
  {
    id: 'snowball-vs-avalanche',
    title: 'Snowball or avalanche: which debt method wins?',
    category: 'Debt',
    minutes: 5,
    icon: 'flame',
    summary: 'Math says one thing, motivation says another. Here is how to choose.',
    premium: true,
    blocks: [
      { t: 'p', text: 'Both methods start the same way: pay the minimum on everything, then aim every spare dollar at one debt at a time.' },
      { t: 'h', text: 'Debt snowball' },
      { t: 'p', text: 'Order debts from the smallest balance to the largest. You pay off the little ones first, which gives you quick wins and frees up their payments. Those payments then roll onto the next debt, growing the snowball.' },
      { t: 'h', text: 'Debt avalanche' },
      { t: 'p', text: 'Order debts by interest rate, highest first. This costs the least in interest and usually finishes sooner on paper.' },
      { t: 'h', text: 'How to choose' },
      { t: 'list', items: ['If you need momentum or have a few small debts, snowball.', 'If you are motivated by numbers and one debt has a very high rate, avalanche.', 'If the difference in interest is small, the one you will actually stick with is the right one.'] },
      { t: 'tip', text: 'Open the Debt roadmap in the Plan tab and flip between the two. It simulates both with your extra amount and shows the payoff month and total interest.' },
    ],
  },
  {
    id: 'starter-emergency-fund',
    title: 'Your starter emergency fund',
    category: 'Saving',
    minutes: 3,
    icon: 'shield',
    summary: 'How much to keep, where to keep it, and when it is okay to use.',
    blocks: [
      { t: 'p', text: 'An emergency fund is what separates "unexpected" from "crisis". A broken phone, a vet bill, a missed shift — none of them should land on a credit card.' },
      { t: 'h', text: 'How much' },
      { t: 'p', text: 'Start with one month of core expenses, or $1,000 if you are tight. Once consumer debt is under control, grow it to three to six months of core expenses.' },
      { t: 'h', text: 'Where' },
      { t: 'p', text: 'A separate savings account at a different bank from the one you spend from. Easy to reach in a real emergency, just inconvenient enough to avoid impulse spending.' },
      { t: 'h', text: 'What counts' },
      { t: 'list', items: ['Yes: an urgent car repair, an unexpected medical bill, an income gap.', 'No: a sale, a holiday, something that was predictable. Those belong in their own fund.'] },
      { t: 'tip', text: 'After you use it, refilling it becomes your next budget line. Put it above fun money until it is whole again.' },
    ],
  },
  {
    id: 'split-transactions',
    title: 'Split a purchase across categories',
    category: 'Budgeting',
    minutes: 2,
    icon: 'scissors',
    summary: 'One receipt, several jobs.',
    blocks: [
      { t: 'p', text: 'A trip to a big-box store might be groceries, a shower curtain and a birthday card. Logging it all as "groceries" quietly breaks the plan.' },
      { t: 'steps', items: ['Add a transaction and enter the total on the keypad.', 'Tap "Split" and choose the first category and its amount.', 'Allot shows what is left to assign. Add the next category until it reaches $0.00.'] },
      { t: 'tip', text: 'The remaining amount appears in a live counter, so you can never save a split that does not match the total.' },
    ],
  },
  {
    id: 'bills-never-missed',
    title: 'Never miss a bill again',
    category: 'Budgeting',
    minutes: 3,
    icon: 'zap',
    summary: 'Use the bills calendar and reminders so due dates stop surprising you.',
    blocks: [
      { t: 'p', text: 'Late fees are the most avoidable money you will ever lose. The trick is to see a month of bills at once, not one at a time.' },
      { t: 'h', text: 'Set a due day' },
      { t: 'p', text: 'Open any budget line and set its due day. It instantly appears on the Bills calendar in the Plan tab.' },
      { t: 'h', text: 'Mark it paid' },
      { t: 'p', text: 'Tap a bill to mark it paid. Overdue bills turn red. Upcoming ones show how many days remain.' },
      { t: 'h', text: 'Get a nudge' },
      { t: 'p', text: 'Turn on bill reminders in Settings. Allot sends a notification the day before each due date, at 9 AM, entirely on your device.' },
      { t: 'tip', text: 'Line your due dates up with payday where you can. Most providers will move a due date for free if you ask.' },
    ],
  },
  {
    id: 'couples-and-money',
    title: 'Two people, one plan',
    category: 'Life',
    minutes: 4,
    icon: 'baby',
    summary: 'Talk about money without it becoming an argument.',
    blocks: [
      { t: 'p', text: 'Couples fight about money less because of the numbers and more because each person is carrying a different picture of them. A shared budget fixes the picture.' },
      { t: 'h', text: 'Hold a monthly money date' },
      { t: 'p', text: 'Thirty minutes, once a month, with snacks. Review last month, plan the next one, decide on any big purchases. Keep it light and keep it regular.' },
      { t: 'h', text: 'Agree on a "no-questions" amount' },
      { t: 'p', text: 'Give each person a personal fun-money line they can spend freely. It protects autonomy and ends the small policing.' },
      { t: 'h', text: 'Decide who tracks and who plans' },
      { t: 'p', text: 'One person can log transactions while the other leads the monthly review, or swap roles quarterly. The point is that both of you are looking at the same plan.' },
      { t: 'tip', text: 'Use the Name field in Settings and the Activity tab to see together where the month went.' },
    ],
  },
  {
    id: 'net-worth',
    title: 'Know your net worth',
    category: 'Life',
    minutes: 3,
    icon: 'trend',
    summary: 'The one number that tracks real progress.',
    premium: true,
    blocks: [
      { t: 'p', text: 'Net worth is everything you own minus everything you owe. It rises when you save, pay down debt, or your investments grow, and falls when you borrow or overspend.' },
      { t: 'h', text: 'How to track it' },
      { t: 'steps', items: ['Add your assets: savings, checking, retirement, car, home value.', 'Add your liabilities: credit cards, loans, mortgage.', 'Update them when something changes. Allot saves a snapshot each time and draws your trend.'] },
      { t: 'tip', text: 'Do not worry if the first number is negative. Many people start there. The direction of the line matters more than where it begins.' },
    ],
  },
  {
    id: 'cut-spending',
    title: 'Trim a category without feeling deprived',
    category: 'Budgeting',
    minutes: 3,
    icon: 'scissors',
    summary: 'Small, specific cuts beat big vague promises.',
    blocks: [
      { t: 'p', text: 'Telling yourself "I will spend less on eating out" rarely lasts a week. A concrete limit does.' },
      { t: 'list', items: ['Cut by a percentage, not to zero. Ten to twenty percent is enough to notice and easy to keep.', 'Keep the thing you love and trade the things you barely notice.', 'Use weekly check-ins. A monthly budget feels far away; a weekly share is real.', 'Watch the merchants view in Reports to see where the small leaks are.'] },
      { t: 'tip', text: 'When a line is nearly full, it turns amber. That is your cue to slow down, not a reason to feel bad.' },
    ],
  },
  {
    id: 'month-end-review',
    title: 'The five-minute month-end review',
    category: 'Start here',
    minutes: 3,
    icon: 'book',
    summary: 'A tiny ritual that makes next month better.',
    blocks: [
      { t: 'p', text: 'A budget is a living thing. Five minutes at month-end teaches you more than hours of planning in advance.' },
      { t: 'steps', items: ['Look at lines that ran over. Is the plan wrong or was it a one-off?', 'Look at lines with money left. Move it to a fund or a debt before it vanishes.', 'Copy the month forward and adjust any amounts that changed.', 'Pick one thing to do differently next month. Just one.'] },
      { t: 'tip', text: 'Allot copies last month’s plan automatically when you open a new month, so the review is edits, not rebuilding.' },
    ],
  },
];

export const TIPS: string[] = [
  'Give your next unspent dollar a job before it wanders off.',
  'A goal with a date becomes a monthly number. Set one on a fund.',
  'Log it now, not tonight. Ten seconds beats ten forgotten purchases.',
  'Nearly empty line? Move money from another line instead of ignoring it.',
  'Extra income is a gift. Decide where it goes before you spend it.',
  'Your streak counts days you logged spending. One entry keeps it alive.',
  'Review your subscriptions each quarter. Cancel one you forgot about.',
  'Fund withdrawals never hurt your monthly budget in Allot. Use them freely.',
];
