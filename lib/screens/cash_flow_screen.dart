import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../utils/money.dart';
import '../stores/accounts_store.dart';
import '../stores/recurring_store.dart';

class _TimelineItem {
  final RecurringRule rule;
  final double runningBalance;
  _TimelineItem({required this.rule, required this.runningBalance});
}

class CashFlowScreen extends StatelessWidget {
  const CashFlowScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final accounts = context.watch<AccountsStore>().accounts;
    final rules = context.watch<RecurringStore>().rules;
    final startBalance = accounts.fold<double>(0, (s, a) => s + a.balance);

    final sortedRules = [...rules]..sort((a, b) => a.nextDueDate.compareTo(b.nextDueDate));
    var running = startBalance;
    final timeline = <_TimelineItem>[];
    for (final r in sortedRules) {
      running -= r.amount;
      timeline.add(_TimelineItem(rule: r, runningBalance: running));
    }

    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Cash Flow', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.lg),
            AppCard(
              margin: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('CURRENT BALANCE', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    formatMoney(startBalance),
                    style: const TextStyle(color: AppColors.text, fontSize: 28, fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()]),
                  ),
                ],
              ),
            ),
            if (timeline.isEmpty)
              const EmptyState(icon: IconChip(child: Icon(LucideIcons.trendingUp, size: 16, color: AppColors.textMuted)), message: 'No upcoming bills to project.')
            else
              for (final item in timeline)
                AppCard(
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.rule.name, style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w600)),
                          Text(item.rule.nextDueDate.substring(0, 10), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '-${formatMoney(item.rule.amount)}',
                            style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()]),
                          ),
                          Text(
                            'Bal: ${formatMoney(item.runningBalance)}',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontFeatures: [FontFeature.tabularFigures()]),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }
}
