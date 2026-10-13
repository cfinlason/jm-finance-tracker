import 'package:flutter/material.dart' hide StepState;
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_card.dart';
import '../widgets/app_segmented_control.dart';
import '../widgets/step_ring.dart';
import '../widgets/step_card.dart';
import '../widgets/net_worth_card.dart';
import '../widgets/list_row.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../widgets/category_icon.dart';
import '../widgets/month_calendar.dart';
import '../utils/money.dart';
import '../logic/baby_steps.dart';
import '../logic/net_worth.dart';
import '../logic/spending_period.dart';
import '../logic/bill_calendar.dart';
import '../stores/accounts_store.dart';
import '../stores/debts_store.dart';
import '../stores/settings_store.dart';
import '../stores/exchange_rate_store.dart';
import '../stores/recurring_store.dart';
import '../stores/transactions_store.dart';
import '../stores/categories_store.dart';
import '../stores/transaction_preview_store.dart';
import 'transaction_edit_dialog.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  SpendingPeriod _period = SpendingPeriod.month;
  double? _baselineRequested;

  static const _periodLabels = {SpendingPeriod.week: 'week', SpendingPeriod.month: 'month', SpendingPeriod.year: 'year'};

  @override
  Widget build(BuildContext context) {
    final accounts = context.watch<AccountsStore>().accounts;
    final debts = context.watch<DebtsStore>().debts;
    final recurringRules = context.watch<RecurringStore>().rules;
    final transactions = context.watch<TransactionsStore>().transactions;
    final categories = context.watch<CategoriesStore>().categories;
    final settingsStore = context.watch<SettingsStore>();
    final settings = settingsStore.settings;
    final rateStore = context.watch<ExchangeRateStore>();
    final now = DateTime.now();

    final monthlyExpenses = estimateMonthlyExpenses(rules: recurringRules, transactions: transactions, now: now);
    final netWorth = computeNetWorth(accounts: accounts, debts: debts, usdToJmdRate: rateStore.rate, goalUsd: settings.netWorthGoalUsd);
    final steps = computeBabySteps(
      accounts: accounts,
      debts: debts,
      settings: settings,
      monthlyExpenses: monthlyExpenses,
      usdToJmdRate: rateStore.rate,
      netWorth: netWorth,
    );

    // Raise the step-2 baseline when consumer debt grows past it (post-frame, once per value).
    final nonMortgageDebtTotal = debts.where((d) => !d.isMortgage).fold<double>(0, (s, d) => s + d.balance);
    final needsRaise = nonMortgageDebtTotal > settings.step2StartTotal;
    final needsReset = nonMortgageDebtTotal == 0 && settings.step2StartTotal > 0;
    if ((needsRaise || needsReset) && _baselineRequested != nonMortgageDebtTotal) {
      _baselineRequested = nonMortgageDebtTotal;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final store = context.read<SettingsStore>();
        if (nonMortgageDebtTotal > store.settings.step2StartTotal) {
          store.raiseStep2Baseline(nonMortgageDebtTotal);
        } else if (nonMortgageDebtTotal == 0) {
          store.resetStep2Baseline();
        }
      });
    }

    final current = steps.where((s) => s.state == StepState.current).firstOrNull;
    final ringTitle = current == null ? 'All steps done' : 'Step ${current.step}: ${current.title}';
    final ringProgress = current == null ? 100 : (current.progress.clamp(0.0, 1.0) * 100).round();
    final spent = spendingInPeriod(transactions, _period, now);

    final recentTop5 = ([...transactions]..sort((a, b) => b.date.compareTo(a.date))).take(5).toList();

    Category? categoryFor(String id) {
      for (final c in categories) {
        if (c.id == id) return c;
      }
      return null;
    }

    final ringSection = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(child: StepRing(steps: steps, centerTitle: ringTitle, centerSubtitle: '$ringProgress% complete')),
        const SizedBox(height: AppSpacing.xl),
        AppSegmentedControl<SpendingPeriod>(
          options: const [
            SegmentOption(label: 'Week', value: SpendingPeriod.week),
            SegmentOption(label: 'Month', value: SpendingPeriod.month),
            SegmentOption(label: 'Year', value: SpendingPeriod.year),
          ],
          value: _period,
          onChanged: (p) => setState(() => _period = p),
        ),
        const SizedBox(height: AppSpacing.md),
        Text('Spent this ${_periodLabels[_period]}: ${formatMoney(spent)}', textAlign: TextAlign.center, style: AppTypography.bodyStrong),
        const SizedBox(height: AppSpacing.xl),
        const _QuickActions(),
      ],
    );
    final netWorthCard = NetWorthCard(
      netWorth: netWorth,
      goalUsd: settings.netWorthGoalUsd,
      rate: rateStore.rate,
      rateUpdatedAt: rateStore.updatedAt,
      rateFailed: rateStore.refreshFailed,
    );
    final stepCards = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final s in steps)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: StepCard(
              key: ValueKey('step-${s.step}'),
              status: s,
              amount: settings.stepAmounts[s.step],
              onToggleDone: s.isManual ? () => settingsStore.setStepCompleted(s.step, s.state != StepState.done) : null,
              onAmountChanged: s.isManual ? (v) => settingsStore.setStepAmount(s.step, v) : null,
            ),
          ),
      ],
    );
    final recentSection = _RecentTransactionsSection(recentTop5: recentTop5, categoryFor: categoryFor);
    const billsSection = _BillsCalendarSection();

    return AppScreen(
      child: ContentBounds(
        child: isExpanded(context)
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: ringSection),
                      const SizedBox(width: AppSpacing.xl),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            netWorthCard,
                            const SizedBox(height: AppSpacing.xl),
                            _AccountsSidebar(accounts: accounts, horizontal: false),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  stepCards,
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(flex: 2, child: recentSection),
                      const SizedBox(width: AppSpacing.xl),
                      Expanded(child: billsSection),
                    ],
                  ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ringSection,
                  const SizedBox(height: AppSpacing.xl),
                  netWorthCard,
                  const SizedBox(height: AppSpacing.xl),
                  stepCards,
                  if (accounts.isNotEmpty) ...[
                    _AccountsSidebar(accounts: accounts, horizontal: true),
                    const SizedBox(height: AppSpacing.xl),
                  ],
                  billsSection,
                  const SizedBox(height: AppSpacing.xl),
                  recentSection,
                ],
              ),
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: AppColors.surface, border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(14)),
      child: Row(
        children: [
          Expanded(child: _QuickAction(icon: LucideIcons.plus, label: 'Add Transaction', onTap: () => showDialog(context: context, builder: (_) => const TransactionEditDialog(id: 'new')))),
          Expanded(child: _QuickAction(icon: LucideIcons.creditCard, label: 'View Debt', onTap: () => context.push('/debts'))),
          Expanded(child: _QuickAction(icon: LucideIcons.trendingUp, label: 'Cash Flow', onTap: () => context.push('/cash-flow'))),
        ],
      ),
    );
  }
}

class _RecentTransactionsSection extends StatelessWidget {
  final List<Transaction> recentTop5;
  final Category? Function(String) categoryFor;

  const _RecentTransactionsSection({required this.recentTop5, required this.categoryFor});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Recent Transactions', style: TextStyle(color: AppColors.text, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: AppSpacing.md),
        if (recentTop5.isEmpty)
          EmptyState(
            icon: const IconChip(child: Icon(LucideIcons.plus, size: 16, color: AppColors.textMuted)),
            message: 'No transactions yet.',
            ctaLabel: 'Add Transaction',
            onPressCta: () => showDialog(context: context, builder: (_) => const TransactionEditDialog(id: 'new')),
          )
        else
          AppCard(
            child: Column(
              children: [
                for (var i = 0; i < recentTop5.length; i++)
                  ListRow(
                    icon: CategoryIcon(name: categoryFor(recentTop5[i].categoryId)?.icon ?? 'more-horizontal'),
                    title: categoryFor(recentTop5[i].categoryId)?.name ?? 'Uncategorized',
                    caption: recentTop5[i].note.isNotEmpty ? recentTop5[i].note : recentTop5[i].date.substring(0, 10),
                    amount: recentTop5[i].amount,
                    isLast: i == recentTop5.length - 1,
                    onTap: () => showDialog(context: context, builder: (_) => TransactionEditDialog(id: recentTop5[i].id)),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Always-visible list of accounts and their balances. On Expanded it renders
/// as a narrow vertical column beside the net worth card ("on the side"); on
/// Compact it renders as a horizontally-scrollable strip so it doesn't push
/// the rest of the dashboard down. While the Add Transaction dialog has an
/// account and a valid amount selected, that account's card shows a live
/// preview of what its balance would become if saved right now (see
/// [TransactionPreviewStore]).
class _AccountsSidebar extends StatelessWidget {
  final List<Account> accounts;
  final bool horizontal;

  const _AccountsSidebar({required this.accounts, required this.horizontal});

  @override
  Widget build(BuildContext context) {
    final preview = context.watch<TransactionPreviewStore>();

    if (accounts.isEmpty) return const SizedBox.shrink();

    final cards = [
      for (final a in accounts) _AccountPreviewCard(account: a, previewDelta: preview.accountId == a.id ? preview.delta : null),
    ];

    if (horizontal) {
      return SizedBox(
        height: 92,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: cards.length,
          separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.sm),
          itemBuilder: (_, i) => SizedBox(width: 168, child: cards[i]),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('ACCOUNTS', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
        const SizedBox(height: AppSpacing.sm),
        for (final c in cards) Padding(padding: const EdgeInsets.only(bottom: AppSpacing.sm), child: c),
      ],
    );
  }
}

class _AccountPreviewCard extends StatelessWidget {
  final Account account;
  final double? previewDelta;

  const _AccountPreviewCard({required this.account, this.previewDelta});

  @override
  Widget build(BuildContext context) {
    final hasPreview = previewDelta != null && previewDelta != 0;
    final newBalance = account.balance + (previewDelta ?? 0);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(account.name, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 4),
          if (!hasPreview)
            Text(
              formatMoney(account.balance),
              style: const TextStyle(color: AppColors.text, fontSize: 16, fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()]),
            )
          else ...[
            Text(
              formatMoney(account.balance),
              style: const TextStyle(color: AppColors.textMuted, fontSize: 11, decoration: TextDecoration.lineThrough, fontFeatures: [FontFeature.tabularFigures()]),
            ),
            Text(
              formatMoney(newBalance),
              style: TextStyle(
                color: previewDelta! < 0 ? AppColors.warning : AppColors.accent,
                fontSize: 16,
                fontWeight: FontWeight.w800,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// A read-only preview of this month's bills as a mini calendar. Every
/// interaction (a day, or the month arrows) just jumps to the full
/// interactive calendar on the Recurring Bills tab rather than duplicating
/// its day-detail popup here.
class _BillsCalendarSection extends StatelessWidget {
  const _BillsCalendarSection();

  @override
  Widget build(BuildContext context) {
    final rules = context.watch<RecurringStore>().rules;
    final month = DateTime.now();
    final occurrences = occurrencesInMonth(rules, month);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Bills This Month', style: TextStyle(color: AppColors.text, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: AppSpacing.md),
        AppCard(
          child: MonthCalendar(
            month: month,
            occurrences: occurrences,
            selectedDate: null,
            onSelectDate: (_) => context.push('/recurring'),
            onPreviousMonth: () => context.push('/recurring'),
            onNextMonth: () => context.push('/recurring'),
            compact: true,
          ),
        ),
      ],
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickAction({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
        child: Column(
          children: [
            Icon(icon, size: 18, color: AppColors.text),
            const SizedBox(height: 6),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.text, fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
