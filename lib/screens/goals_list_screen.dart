import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_card.dart';
import '../widgets/app_progress_bar.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../utils/money.dart';
import '../stores/goals_store.dart';
import '../models/models.dart';
import 'goal_edit_dialog.dart';
import 'goal_contribution_dialog.dart';

class GoalsListScreen extends StatelessWidget {
  const GoalsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final goals = context.watch<GoalsStore>().goals;
    final width = MediaQuery.sizeOf(context).width;
    final columns = !isExpanded(context) ? 1 : (width >= 1200 ? 3 : 2);

    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Goals', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
                IconButton(icon: const Icon(LucideIcons.plus, color: AppColors.accent), onPressed: () => showDialog(context: context, builder: (_) => const GoalEditDialog(id: 'new'))),
              ],
            ),
            if (goals.isEmpty)
              EmptyState(
                icon: const IconChip(child: Icon(LucideIcons.target, size: 16, color: AppColors.textMuted)),
                message: 'No goals yet.',
                ctaLabel: 'Add Goal',
                onPressCta: () => showDialog(context: context, builder: (_) => const GoalEditDialog(id: 'new')),
              )
            else
              GridView.count(
                crossAxisCount: columns,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: AppSpacing.md,
                crossAxisSpacing: AppSpacing.md,
                childAspectRatio: columns == 1 ? 3.2 : 2.2,
                children: [for (final g in goals) _GoalCard(goal: g)],
              ),
          ],
        ),
      ),
    );
  }
}

class _GoalCard extends StatelessWidget {
  final Goal goal;
  const _GoalCard({required this.goal});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => showDialog(context: context, builder: (_) => GoalContributionDialog(goalId: goal.id)),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(goal.name, style: const TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis)),
                IconButton(
                  icon: const Icon(LucideIcons.pencil, size: 16, color: AppColors.textMuted),
                  onPressed: () => showDialog(context: context, builder: (_) => GoalEditDialog(id: goal.id)),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            AppProgressBar(progress: goal.targetAmount == 0 ? 0 : goal.currentAmount / goal.targetAmount),
            const SizedBox(height: AppSpacing.sm),
            Text(
              '${formatMoney(goal.currentAmount)} of ${formatMoney(goal.targetAmount)}',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13, fontFeatures: [FontFeature.tabularFigures()]),
            ),
          ],
        ),
      ),
    );
  }
}
