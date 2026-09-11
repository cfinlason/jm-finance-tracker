import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/accounts_store.dart';
import '../stores/transactions_store.dart';
import '../stores/recurring_store.dart';
import '../logic/account_actions.dart';

const _accountTypes = [
  SegmentOption(label: 'Checking', value: 'checking'),
  SegmentOption(label: 'Savings', value: 'savings'),
  SegmentOption(label: 'Cash', value: 'cash'),
  SegmentOption(label: 'Credit', value: 'credit'),
];

class AccountEditScreen extends StatefulWidget {
  final String id;
  const AccountEditScreen({super.key, required this.id});

  @override
  State<AccountEditScreen> createState() => _AccountEditScreenState();
}

class _AccountEditScreenState extends State<AccountEditScreen> {
  String _name = '';
  String _type = 'checking';
  String _balanceText = '0';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final accountsStore = context.watch<AccountsStore>();
    final isNew = widget.id == 'new';

    Account? account;
    if (!isNew) {
      for (final a in accountsStore.accounts) {
        if (a.id == widget.id) {
          account = a;
          break;
        }
      }
    }

    if (!_initialized) {
      _name = account?.name ?? '';
      _type = account?.type ?? 'checking';
      _balanceText = account != null ? account.balance.toString() : '0';
      _initialized = true;
    }

    void handleSave() {
      final balance = double.tryParse(_balanceText);
      if (_name.isEmpty || balance == null) return;
      if (isNew) {
        accountsStore.addAccount(name: _name, type: _type, balance: balance);
      } else if (account != null) {
        accountsStore.updateAccount(account.id, name: _name, type: _type, balance: balance);
      }
      context.pop();
    }

    void handleDelete() {
      final accountActions = AccountActions(
        accountsStore: accountsStore,
        transactionsStore: context.read<TransactionsStore>(),
        recurringStore: context.read<RecurringStore>(),
      );
      final dependents = accountActions.countDependents(account!.id);
      final hasDependents = dependents.transactionCount > 0 || dependents.recurringRuleCount > 0;
      final message = hasDependents
          ? 'Delete account? This will also delete ${dependents.transactionCount} associated transaction(s) '
              'and ${dependents.recurringRuleCount} recurring bill(s). This cannot be undone.'
          : 'This cannot be undone.';

      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Delete account?', style: TextStyle(color: AppColors.text)),
          content: Text(message, style: const TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                accountActions.deleteAccountCascade(account!.id);
                Navigator.pop(dialogContext);
                context.pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(isNew ? 'Add Account' : 'Edit Account', style: const TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.lg),
          AppFormField(label: 'Account name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. NCB Checking'),
          const SizedBox(height: AppSpacing.md),
          AppSegmentedControl<String>(options: _accountTypes, value: _type, onChanged: (v) => setState(() => _type = v)),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Balance (J\$)', value: _balanceText, onChanged: (v) => setState(() => _balanceText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: (_name.isNotEmpty && _balanceText.isNotEmpty) ? handleSave : null),
          if (!isNew && account != null) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}
