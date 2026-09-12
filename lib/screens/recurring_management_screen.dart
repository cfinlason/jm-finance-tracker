import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_card.dart';
import '../widgets/list_row.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../stores/recurring_store.dart';
import 'recurring_edit_dialog.dart';

class RecurringManagementScreen extends StatelessWidget {
  const RecurringManagementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final rules = context.watch<RecurringStore>().rules;

    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recurring Bills', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
                IconButton(icon: const Icon(LucideIcons.plus, color: AppColors.accent), onPressed: () => showDialog(context: context, builder: (_) => const RecurringEditDialog(id: 'new'))),
              ],
            ),
            if (rules.isEmpty)
              EmptyState(
                icon: const IconChip(child: Icon(LucideIcons.repeat, size: 16, color: AppColors.textMuted)),
                message: 'No recurring bills.',
                ctaLabel: 'Add Bill',
                onPressCta: () => showDialog(context: context, builder: (_) => const RecurringEditDialog(id: 'new')),
              )
            else
              AppCard(
                child: Column(
                  children: [
                    for (var i = 0; i < rules.length; i++)
                      ListRow(
                        icon: const Icon(LucideIcons.repeat, size: 16, color: AppColors.textSecondary),
                        title: rules[i].name,
                        caption: '${rules[i].frequency} · due ${rules[i].nextDueDate.substring(0, 10)}',
                        amount: -rules[i].amount,
                        isLast: i == rules.length - 1,
                        onTap: () => showDialog(context: context, builder: (_) => RecurringEditDialog(id: rules[i].id)),
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
