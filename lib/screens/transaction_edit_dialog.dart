import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';
import '../stores/transactions_store.dart';
import '../stores/goals_store.dart';
import '../logic/transaction_actions.dart';

class TransactionEditDialog extends StatefulWidget {
  final String id;
  const TransactionEditDialog({super.key, required this.id});

  @override
  State<TransactionEditDialog> createState() => _TransactionEditDialogState();
}

class _TransactionEditDialogState extends State<TransactionEditDialog> {
  late String _type;
  late String _amountText;
  late String _accountId;
  late String _categoryId;
  late String _note;
  String _error = '';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final accounts = context.watch<AccountsStore>().accounts;
    final categories = context.watch<CategoriesStore>().categories;
    final transactionsStore = context.watch<TransactionsStore>();
    final isNew = widget.id == 'new';

    Transaction? existing;
    if (!isNew) {
      for (final t in transactionsStore.transactions) {
        if (t.id == widget.id) {
          existing = t;
          break;
        }
      }
    }

    if (!_initialized) {
      _type = existing?.type == 'income' ? 'income' : 'expense';
      _amountText = existing != null ? existing.amount.abs().toString() : '';
      _accountId = existing?.accountId ?? (accounts.isNotEmpty ? accounts[0].id : '');
      _categoryId = existing?.categoryId ?? (categories.isNotEmpty ? categories[0].id : '');
      _note = existing?.note ?? '';
      _initialized = true;
    }

    final amount = double.tryParse(_amountText);
    final isValid = amount != null && amount > 0 && _accountId.isNotEmpty && _categoryId.isNotEmpty;

    final actions = TransactionActions(
      accountsStore: context.read<AccountsStore>(),
      transactionsStore: transactionsStore,
      goalsStore: context.read<GoalsStore>(),
    );

    void handleSave() {
      if (!isValid) {
        setState(() => _error = 'Enter a valid amount, account, and category.');
        return;
      }
      // amount is guaranteed non-null because isValid checks amount != null
      // ignore: unnecessary_non_null_assertion
      final signedAmount = _type == 'income' ? amount! : -amount!;
      if (isNew) {
        actions.createTransaction(
          accountId: _accountId,
          categoryId: _categoryId,
          amount: signedAmount,
          note: _note,
          date: DateTime.now().toIso8601String(),
          type: _type,
        );
      } else if (existing != null) {
        actions.editTransaction(existing.id, accountId: _accountId, categoryId: _categoryId, amount: signedAmount, note: _note, type: _type);
      }
      Navigator.of(context).pop();
    }

    void handleDelete() {
      final target = existing;
      if (target == null) return;
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Delete transaction?', style: TextStyle(color: AppColors.text)),
          content: const Text('This cannot be undone.', style: TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                actions.deleteTransaction(target.id);
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
      title: isNew ? 'Add Transaction' : 'Edit Transaction',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AppSegmentedControl<String>(
            options: const [SegmentOption(label: 'Expense', value: 'expense'), SegmentOption(label: 'Income', value: 'income')],
            value: _type,
            onChanged: (v) => setState(() => _type = v),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppFormField(
            label: 'Amount (J\$)',
            value: _amountText,
            onChanged: (v) => setState(() => _amountText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            placeholder: '0.00',
            error: _error.isNotEmpty ? _error : null,
          ),
          const SizedBox(height: AppSpacing.md),
          const Text('ACCOUNT', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [for (final a in accounts) _Chip(label: a.name, active: _accountId == a.id, onTap: () => setState(() => _accountId = a.id))],
          ),
          const SizedBox(height: AppSpacing.md),
          const Text('CATEGORY', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [for (final c in categories) _Chip(label: c.name, active: _categoryId == c.id, onTap: () => setState(() => _categoryId = c.id))],
          ),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Note', value: _note, onChanged: (v) => setState(() => _note = v), placeholder: 'Optional note'),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: isValid ? handleSave : null),
          if (!isNew && existing != null) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _Chip({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
        decoration: BoxDecoration(
          color: active ? AppColors.accent : Colors.transparent,
          border: Border.all(color: active ? AppColors.accent : AppColors.border),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(label, style: TextStyle(color: active ? AppColors.accentInk : AppColors.text, fontSize: 13, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
