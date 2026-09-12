import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../stores/goals_store.dart';

class GoalEditDialog extends StatefulWidget {
  final String id;
  const GoalEditDialog({super.key, required this.id});

  @override
  State<GoalEditDialog> createState() => _GoalEditDialogState();
}

class _GoalEditDialogState extends State<GoalEditDialog> {
  String _name = '';
  String _targetText = '';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final goalsStore = context.watch<GoalsStore>();
    final isNew = widget.id == 'new';

    Goal? goal;
    if (!isNew) {
      for (final g in goalsStore.goals) {
        if (g.id == widget.id) {
          goal = g;
          break;
        }
      }
    }

    if (!_initialized) {
      _name = goal?.name ?? '';
      _targetText = goal != null ? goal.targetAmount.toString() : '';
      _initialized = true;
    }

    void handleSave() {
      final target = double.tryParse(_targetText);
      if (_name.isEmpty || target == null || target <= 0) return;
      if (isNew) {
        goalsStore.addGoal(name: _name, icon: 'target', targetAmount: target);
      } else if (goal != null) {
        goalsStore.updateGoal(goal.id, name: _name, targetAmount: target);
      }
      Navigator.of(context).pop();
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
                Navigator.of(context).pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    final isNameValid = _name.isNotEmpty && (double.tryParse(_targetText) ?? 0) > 0;

    return AppDialog(
      title: isNew ? 'Add Goal' : 'Edit Goal',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
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
          AppButton(label: isNew ? 'Create Goal' : 'Save', onPressed: isNameValid ? handleSave : null),
          if (!isNew && goal != null) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}
