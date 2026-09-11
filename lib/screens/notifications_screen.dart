import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/list_row.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../utils/date_utils.dart' as date_utils;
import '../stores/recurring_store.dart';
import '../stores/goals_store.dart';

class _NotificationItem {
  final String title;
  final String caption;
  const _NotificationItem({required this.title, required this.caption});
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final rules = context.watch<RecurringStore>().rules;
    final goals = context.watch<GoalsStore>().goals;

    final now = DateTime.now();
    final soon = date_utils.addDays(now, 7);

    final notifications = <_NotificationItem>[
      for (final r in rules)
        if (date_utils.isBefore(DateTime.parse(r.nextDueDate), soon))
          _NotificationItem(title: '${r.name} due soon', caption: r.nextDueDate.substring(0, 10)),
      for (final g in goals)
        if (g.currentAmount >= g.targetAmount) _NotificationItem(title: '${g.name} goal reached!', caption: 'Milestone hit'),
    ];

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Notifications', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.lg),
          if (notifications.isEmpty)
            const EmptyState(icon: IconChip(child: Icon(LucideIcons.bell, size: 16, color: AppColors.textMuted)), message: 'No notifications.')
          else
            AppCard(
              child: Column(
                children: [
                  for (var i = 0; i < notifications.length; i++)
                    ListRow(
                      icon: const Icon(LucideIcons.bell, size: 16, color: AppColors.textSecondary),
                      title: notifications[i].title,
                      caption: notifications[i].caption,
                      isLast: i == notifications.length - 1,
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
