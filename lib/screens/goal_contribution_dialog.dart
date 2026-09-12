import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_progress_bar.dart';
import '../utils/money.dart';
import '../stores/goals_store.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';
import '../stores/transactions_store.dart';
import '../logic/transaction_actions.dart';

class GoalContributionDialog extends StatefulWidget {
  final String goalId;
  const GoalContributionDialog({super.key, required this.goalId});

  @override
  State<GoalContributionDialog> createState() => _GoalContributionDialogState();
}

class _GoalContributionDialogState extends State<GoalContributionDialog> {
  String _contribution = '';

  @override
  Widget build(BuildContext context) {
    final goalsStore = context.watch<GoalsStore>();

    Goal? goal;
    for (final g in goalsStore.goals) {
      if (g.id == widget.goalId) {
        goal = g;
        break;
      }
    }

    if (goal == null) {
      return AppDialog(
        title: 'Goal not found',
        child: const SizedBox(height: 40, child: Center(child: Text('This goal was deleted.', style: TextStyle(color: AppColors.textSecondary)))),
      );
    }
    final resolvedGoal = goal;

    final accounts = context.watch<AccountsStore>().accounts;
    final categories = context.watch<CategoriesStore>().categories;
    Category? transferCategory;
    for (final c in categories) {
      if (c.name == 'Transfer') {
        transferCategory = c;
        break;
      }
    }

    final actions = TransactionActions(
      accountsStore: context.read<AccountsStore>(),
      transactionsStore: context.read<TransactionsStore>(),
      goalsStore: goalsStore,
    );

    void handleAddContribution() {
      final amount = double.tryParse(_contribution);
      if (amount == null || amount <= 0 || accounts.isEmpty || transferCategory == null) return;
      actions.createTransaction(
        accountId: accounts[0].id,
        categoryId: transferCategory.id,
        amount: -amount,
        note: 'Contribution to ${resolvedGoal.name}',
        date: DateTime.now().toIso8601String(),
        type: 'goal_contribution',
        goalId: resolvedGoal.id,
      );
      setState(() => _contribution = '');
    }

    return AppDialog(
      title: resolvedGoal.name,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AppProgressBar(progress: resolvedGoal.targetAmount == 0 ? 0 : resolvedGoal.currentAmount / resolvedGoal.targetAmount),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '${formatMoney(resolvedGoal.currentAmount)} of ${formatMoney(resolvedGoal.targetAmount)}',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 13, fontFeatures: [FontFeature.tabularFigures()]),
          ),
          const SizedBox(height: AppSpacing.xl),
          AppFormField(
            label: 'Add contribution (J\$)',
            value: _contribution,
            onChanged: (v) => setState(() => _contribution = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            placeholder: '0.00',
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(label: 'Add Contribution', onPressed: _contribution.isNotEmpty ? handleAddContribution : null),
        ],
      ),
    );
  }
}
