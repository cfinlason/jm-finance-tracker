import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_progress_bar.dart';
import '../utils/money.dart';
import '../stores/goals_store.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';
import '../stores/transactions_store.dart';
import '../logic/transaction_actions.dart';

class GoalDetailScreen extends StatefulWidget {
  final String id;
  const GoalDetailScreen({super.key, required this.id});

  @override
  State<GoalDetailScreen> createState() => _GoalDetailScreenState();
}

class _GoalDetailScreenState extends State<GoalDetailScreen> {
  String _name = '';
  String _targetText = '';
  String _contribution = '';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final goalsStore = context.watch<GoalsStore>();
    final isNew = widget.id == 'new';

    if (isNew) {
      return AppScreen(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('New Goal', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.lg),
            AppFormField(label: 'Goal name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Emergency Fund'),
            const SizedBox(height: AppSpacing.md),
            AppFormField(
              label: 'Target amount (J\$)',
              value: _targetText,
              onChanged: (v) => setState(() => _targetText = v),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              placeholder: '0.00',
            ),
            const SizedBox(height: AppSpacing.xl),
            AppButton(
              label: 'Create Goal',
              onPressed: (_name.isNotEmpty && _targetText.isNotEmpty)
                  ? () {
                      final target = double.tryParse(_targetText);
                      if (target == null || target <= 0) return;
                      goalsStore.addGoal(name: _name, icon: 'target', targetAmount: target);
                      context.pop();
                    }
                  : null,
            ),
          ],
        ),
      );
    }

    Goal? goal;
    for (final g in goalsStore.goals) {
      if (g.id == widget.id) {
        goal = g;
        break;
      }
    }

    if (goal == null) {
      return const AppScreen(child: Text('Goal not found', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)));
    }

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
    final resolvedGoal = goal;

    if (!_initialized) {
      _name = resolvedGoal.name;
      _targetText = resolvedGoal.targetAmount.toString();
      _initialized = true;
    }

    void handleSave() {
      final target = double.tryParse(_targetText);
      if (_name.isEmpty || target == null || target <= 0) return;
      goalsStore.updateGoal(resolvedGoal.id, name: _name, targetAmount: target);
    }

    void handleDelete() {
      final target = goal;
      if (target == null) return;
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Delete goal?', style: TextStyle(color: AppColors.text)),
          content: const Text('This cannot be undone.', style: TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                goalsStore.removeGoal(target.id);
                Navigator.pop(dialogContext);
                context.pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    final isNameValid = _name.isNotEmpty && (double.tryParse(_targetText) ?? 0) > 0;

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

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Edit Goal', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.lg),
          AppFormField(label: 'Goal name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Emergency Fund'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(
            label: 'Target amount (J\$)',
            value: _targetText,
            onChanged: (v) => setState(() => _targetText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            placeholder: '0.00',
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(label: 'Save', onPressed: isNameValid ? handleSave : null),
          const SizedBox(height: AppSpacing.lg),
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
          if (!isNew) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}
