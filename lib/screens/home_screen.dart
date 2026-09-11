import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/stat_figure.dart';
import '../widgets/list_row.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../widgets/category_icon.dart';
import '../utils/money.dart';
import '../logic/safe_to_spend.dart';
import '../stores/accounts_store.dart';
import '../stores/recurring_store.dart';
import '../stores/transactions_store.dart';
import '../stores/categories_store.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final accounts = context.watch<AccountsStore>().accounts;
    final recurringRules = context.watch<RecurringStore>().rules;
    final transactions = context.watch<TransactionsStore>().transactions;
    final categories = context.watch<CategoriesStore>().categories;

    final safeToSpend = calculateSafeToSpend(accounts, recurringRules);
    final recentTop5 = ([...transactions]..sort((a, b) => b.date.compareTo(a.date))).take(5).toList();
    final monthIncome = transactions.where((t) => t.type == 'income').fold<double>(0, (s, t) => s + t.amount);
    final monthSpending = transactions.where((t) => t.type == 'expense').fold<double>(0, (s, t) => s + t.amount.abs());
    final upcoming = recurringRules.fold<double>(0, (s, r) => s + r.amount);

    Category? categoryFor(String id) {
      for (final c in categories) {
        if (c.id == id) return c;
      }
      return null;
    }

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            emphasis: true,
            margin: const EdgeInsets.only(bottom: AppSpacing.xl),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('SAFE TO SPEND', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  formatMoney(safeToSpend),
                  style: const TextStyle(color: AppColors.text, fontSize: 60, fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()]),
                ),
              ],
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              StatFigure(label: 'Income', amount: monthIncome, tone: StatTone.positive),
              StatFigure(label: 'Spending', amount: monthSpending),
              StatFigure(label: 'Upcoming', amount: upcoming),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          Container(
            decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(14)),
            margin: const EdgeInsets.only(bottom: AppSpacing.xl),
            child: Row(
              children: [
                Expanded(child: _QuickAction(icon: LucideIcons.plus, label: 'Add Transaction', onTap: () => context.push('/transaction/new'))),
                Expanded(child: _QuickAction(icon: LucideIcons.creditCard, label: 'View Debt', onTap: () => context.push('/debt'))),
                Expanded(child: _QuickAction(icon: LucideIcons.trendingUp, label: 'Cash Flow', onTap: () => context.push('/cash-flow'))),
              ],
            ),
          ),
          const Text('Recent Transactions', style: TextStyle(color: AppColors.text, fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.md),
          if (recentTop5.isEmpty)
            EmptyState(
              icon: const IconChip(child: Icon(LucideIcons.plus, size: 16, color: AppColors.textMuted)),
              message: 'No transactions yet.',
              ctaLabel: 'Add Transaction',
              onPressCta: () => context.push('/transaction/new'),
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
                      onTap: () => context.push('/transaction/${recentTop5[i].id}'),
                    ),
                ],
              ),
            ),
        ],
      ),
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
