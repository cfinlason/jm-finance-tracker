import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/recurring_store.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';

const _frequencies = [
  SegmentOption(label: 'Weekly', value: 'weekly'),
  SegmentOption(label: 'Biweekly', value: 'biweekly'),
  SegmentOption(label: 'Monthly', value: 'monthly'),
];

class RecurringEditDialog extends StatefulWidget {
  final String id;
  const RecurringEditDialog({super.key, required this.id});

  @override
  State<RecurringEditDialog> createState() => _RecurringEditDialogState();
}

class _RecurringEditDialogState extends State<RecurringEditDialog> {
  String _name = '';
  String _amountText = '';
  String _frequency = 'monthly';
  String _nextDueDate = '';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final recurringStore = context.watch<RecurringStore>();
    final accountsStore = context.watch<AccountsStore>();
    final categoriesStore = context.watch<CategoriesStore>();
    final isNew = widget.id == 'new';

    RecurringRule? rule;
    if (!isNew) {
      for (final r in recurringStore.rules) {
        if (r.id == widget.id) {
          rule = r;
          break;
        }
      }
    }

    if (!_initialized) {
      _name = rule?.name ?? '';
      _amountText = rule != null ? rule.amount.toString() : '';
      _frequency = rule?.frequency ?? 'monthly';
      _nextDueDate = rule?.nextDueDate ?? DateTime.now().toIso8601String();
      _initialized = true;
    }

    void handleSave() {
      final amount = double.tryParse(_amountText);
      if (_name.isEmpty || amount == null || accountsStore.accounts.isEmpty || categoriesStore.categories.isEmpty) return;
      if (isNew) {
        recurringStore.addRule(
          name: _name,
          categoryId: categoriesStore.categories[0].id,
          accountId: accountsStore.accounts[0].id,
          amount: amount,
          frequency: _frequency,
          nextDueDate: _nextDueDate,
        );
      } else if (rule != null) {
        recurringStore.updateRule(rule.id, name: _name, amount: amount, frequency: _frequency, nextDueDate: _nextDueDate);
      }
      Navigator.of(context).pop();
    }

    void handleMarkPaid() {
      if (rule != null) {
        recurringStore.advanceNextDueDate(rule.id);
      }
    }

    Future<void> handlePickDate() async {
      final current = DateTime.tryParse(_nextDueDate) ?? DateTime.now();
      final picked = await showDatePicker(
        context: context,
        initialDate: current,
        firstDate: DateTime(current.year - 5),
        lastDate: DateTime(current.year + 5),
      );
      if (picked != null) {
        setState(() => _nextDueDate = picked.toIso8601String());
      }
    }

    void handleDelete() {
      final target = rule;
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Delete recurring bill?', style: TextStyle(color: AppColors.text)),
          content: const Text('This cannot be undone.', style: TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                if (target != null) {
                  recurringStore.removeRule(target.id);
                }
                Navigator.pop(dialogContext);
                Navigator.of(context).pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    return AppDialog(
      title: isNew ? 'Add Recurring Bill' : 'Edit Recurring Bill',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AppFormField(label: 'Name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Netflix'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Amount (J\$)', value: _amountText, onChanged: (v) => setState(() => _amountText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.md),
          AppSegmentedControl<String>(options: _frequencies, value: _frequency, onChanged: (v) => setState(() => _frequency = v)),
          const SizedBox(height: AppSpacing.md),
          GestureDetector(
            onTap: handlePickDate,
            child: AbsorbPointer(
              child: AppFormField(label: 'Next due date', value: _nextDueDate.substring(0, 10), onChanged: (_) {}),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: (_name.isNotEmpty && _amountText.isNotEmpty) ? handleSave : null),
          if (!isNew && rule != null) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Mark Paid', variant: AppButtonVariant.secondary, onPressed: handleMarkPaid),
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}
