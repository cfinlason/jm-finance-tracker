import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/app_progress_bar.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../utils/money.dart';
import '../stores/goals_store.dart';

class GoalsListScreen extends StatelessWidget {
  const GoalsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final goals = context.watch<GoalsStore>().goals;

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Goals', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
              IconButton(icon: const Icon(LucideIcons.plus, color: AppColors.accent), onPressed: () => context.push('/goal/new')),
            ],
          ),
          if (goals.isEmpty)
            EmptyState(
              icon: const IconChip(child: Icon(LucideIcons.target, size: 16, color: AppColors.textMuted)),
              message: 'No goals yet.',
              ctaLabel: 'Add Goal',
              onPressCta: () => context.push('/goal/new'),
            )
          else
            for (final g in goals)
              GestureDetector(
                onTap: () => context.push('/goal/${g.id}'),
                child: AppCard(
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(g.name, style: const TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700)),
                      const SizedBox(height: AppSpacing.sm),
                      AppProgressBar(progress: g.targetAmount == 0 ? 0 : g.currentAmount / g.targetAmount),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        '${formatMoney(g.currentAmount)} of ${formatMoney(g.targetAmount)}',
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 13, fontFeatures: [FontFeature.tabularFigures()]),
                      ),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}
