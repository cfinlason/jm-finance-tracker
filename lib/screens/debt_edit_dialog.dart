import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../stores/debts_store.dart';
import '../stores/recurring_store.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';
import '../logic/debt_actions.dart';

class DebtEditDialog extends StatefulWidget {
  final String id;
  const DebtEditDialog({super.key, required this.id});

  @override
  State<DebtEditDialog> createState() => _DebtEditDialogState();
}

class _DebtEditDialogState extends State<DebtEditDialog> {
  String _name = '';
  String _balanceText = '';
  String _rateText = '';
  String _minPaymentText = '';
  String _dueDayText = '1';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final debtsStore = context.watch<DebtsStore>();
    final isNew = widget.id == 'new';

    Debt? debt;
    if (!isNew) {
      for (final d in debtsStore.debts) {
        if (d.id == widget.id) {
          debt = d;
          break;
        }
      }
    }

    if (!_initialized) {
      _name = debt?.name ?? '';
      _balanceText = debt != null ? debt.balance.toString() : '';
      _rateText = debt != null ? debt.interestRate.toString() : '';
      _minPaymentText = debt != null ? debt.minPayment.toString() : '';
      _dueDayText = debt != null ? debt.dueDayOfMonth.toString() : '1';
      _initialized = true;
    }

    final actions = DebtActions(
      debtsStore: debtsStore,
      recurringStore: context.read<RecurringStore>(),
      accountsStore: context.read<AccountsStore>(),
      categoriesStore: context.read<CategoriesStore>(),
    );

    void handleSave() {
      final balance = double.tryParse(_balanceText);
      final interestRate = double.tryParse(_rateText);
      final minPayment = double.tryParse(_minPaymentText);
      final dueDay = int.tryParse(_dueDayText);
      if (_name.isEmpty || balance == null || interestRate == null || minPayment == null || dueDay == null || dueDay < 1 || dueDay > 31) return;
      if (isNew) {
        actions.createDebtWithRecurring(name: _name, balance: balance, interestRate: interestRate, minPayment: minPayment, dueDayOfMonth: dueDay);
      } else if (debt != null) {
        actions.updateDebtWithRecurring(
          debt.id,
          name: _name,
          balance: balance,
          interestRate: interestRate,
          minPayment: minPayment,
          dueDayOfMonth: dueDay,
          existingRecurringRuleId: debt.recurringRuleId,
        );
      }
      Navigator.of(context).pop();
    }

    void handleDelete() {
      final target = debt;
      if (target == null) return;
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Delete debt?', style: TextStyle(color: AppColors.text)),
          content: Text(
            target.recurringRuleId != null
                ? 'This will also delete its linked recurring bill. This cannot be undone.'
                : 'This cannot be undone.',
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                actions.deleteDebtCascade(target.id, recurringRuleId: target.recurringRuleId);
                Navigator.pop(dialogContext);
                Navigator.of(context).pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    final dueDayValid = (int.tryParse(_dueDayText) ?? 0) >= 1 && (int.tryParse(_dueDayText) ?? 0) <= 31;
    final isValid = _name.isNotEmpty && _balanceText.isNotEmpty && _rateText.isNotEmpty && _minPaymentText.isNotEmpty && dueDayValid;

    return AppDialog(
      title: isNew ? 'Add Debt' : 'Edit Debt',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AppFormField(label: 'Debt name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Credit Card'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Balance (J\$)', value: _balanceText, onChanged: (v) => setState(() => _balanceText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Interest rate (APR %)', value: _rateText, onChanged: (v) => setState(() => _rateText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Minimum payment (J\$)', value: _minPaymentText, onChanged: (v) => setState(() => _minPaymentText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.md),
          AppFormField(
            label: 'Due day of month (1-31)',
            value: _dueDayText,
            onChanged: (v) => setState(() => _dueDayText = v),
            keyboardType: TextInputType.number,
            error: !dueDayValid ? 'Enter a day between 1 and 31' : null,
          ),
          const SizedBox(height: 4),
          const Text(
            'This is added as a recurring bill automatically — no need to add it separately.',
            style: TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: isValid ? handleSave : null),
          if (!isNew && debt != null) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}
