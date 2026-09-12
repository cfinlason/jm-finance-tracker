import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../stores/debts_store.dart';

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
      _initialized = true;
    }

    void handleSave() {
      final balance = double.tryParse(_balanceText);
      final interestRate = double.tryParse(_rateText);
      final minPayment = double.tryParse(_minPaymentText);
      if (_name.isEmpty || balance == null || interestRate == null || minPayment == null) return;
      if (isNew) {
        debtsStore.addDebt(name: _name, balance: balance, interestRate: interestRate, minPayment: minPayment, dueDayOfMonth: 1);
      } else if (debt != null) {
        debtsStore.updateDebt(debt.id, name: _name, balance: balance, interestRate: interestRate, minPayment: minPayment);
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
          content: const Text('This cannot be undone.', style: TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                debtsStore.removeDebt(target.id);
                Navigator.pop(dialogContext);
                Navigator.of(context).pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    final isValid = _name.isNotEmpty && _balanceText.isNotEmpty && _rateText.isNotEmpty && _minPaymentText.isNotEmpty;

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
