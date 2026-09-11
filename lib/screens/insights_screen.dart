import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../widgets/category_icon.dart';
import '../utils/money.dart';
import '../utils/date_utils.dart' as date_utils;
import '../logic/insights.dart';
import '../stores/transactions_store.dart';
import '../stores/categories_store.dart';

class InsightsScreen extends StatelessWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final transactions = context.watch<TransactionsStore>().transactions;
    final categories = context.watch<CategoriesStore>().categories;

    if (transactions.isEmpty) {
      return AppScreen(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Insights', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.lg),
            const EmptyState(
              icon: IconChip(child: Icon(LucideIcons.pieChart, size: 16, color: AppColors.textMuted)),
              message: 'Add transactions to see insights.',
            ),
          ],
        ),
      );
    }

    final now = DateTime.now();
    final periodStart = date_utils.addMonths(now, -1);
    final previousPeriodStart = date_utils.addMonths(now, -2);

    final totals = categoryTotals(transactions, periodStart, now, previousPeriodStart, periodStart);
    final trend = incomeVsSpendingTrend(transactions, 'week', 6, now);
    final top5 = topTransactions(transactions, periodStart, now, n: 5);

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
          const Text('Insights', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.lg),
          const Text('Category Breakdown', style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            margin: const EdgeInsets.only(bottom: AppSpacing.lg),
            child: Column(
              children: [
                for (var i = 0; i < totals.length; i++)
                  _InsightRow(
                    icon: CategoryIcon(name: categoryFor(totals[i].categoryId)?.icon ?? 'more-horizontal'),
                    title: categoryFor(totals[i].categoryId)?.name ?? 'Uncategorized',
                    subtitle: totals[i].percentChange != null
                        ? '${totals[i].percentChange! > 0 ? '+' : ''}${totals[i].percentChange}% vs last period'
                        : null,
                    amount: formatMoney(totals[i].total),
                    isLast: i == totals.length - 1,
                  ),
              ],
            ),
          ),
          const Text('Weekly Trend', style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            margin: const EdgeInsets.only(bottom: AppSpacing.lg),
            child: Column(
              children: [
                for (final bucket in trend)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                    child: Row(
                      children: [
                        Expanded(child: Text(bucket.label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12))),
                        Text(
                          '+${formatMoney(bucket.income)}',
                          style: const TextStyle(color: AppColors.accent, fontSize: 13, fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()]),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Text(
                          '-${formatMoney(bucket.spending)}',
                          style: const TextStyle(color: AppColors.text, fontSize: 13, fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()]),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const Text('Top Transactions', style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            child: Column(
              children: [
                for (var i = 0; i < top5.length; i++)
                  _InsightRow(
                    icon: CategoryIcon(name: categoryFor(top5[i].categoryId)?.icon ?? 'more-horizontal'),
                    title: categoryFor(top5[i].categoryId)?.name ?? 'Uncategorized',
                    subtitle: null,
                    amount: formatMoney(top5[i].amount),
                    isLast: i == top5.length - 1,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InsightRow extends StatelessWidget {
  final Widget icon;
  final String title;
  final String? subtitle;
  final String amount;
  final bool isLast;

  const _InsightRow({required this.icon, required this.title, this.subtitle, required this.amount, required this.isLast});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(border: isLast ? null : const Border(bottom: BorderSide(color: AppColors.borderHairline, width: 1))),
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm2),
      child: Row(
        children: [
          IconChip(child: icon),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w600)),
                if (subtitle != null) Text(subtitle!, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ),
          Text(amount, style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()])),
        ],
      ),
    );
  }
}
