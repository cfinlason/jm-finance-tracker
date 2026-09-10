import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_form_field.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_card.dart';
import '../../widgets/list_row.dart';
import '../../stores/accounts_store.dart';

class OnboardingAccountsScreen extends StatefulWidget {
  const OnboardingAccountsScreen({super.key});

  @override
  State<OnboardingAccountsScreen> createState() => _OnboardingAccountsScreenState();
}

class _OnboardingAccountsScreenState extends State<OnboardingAccountsScreen> {
  String _name = '';
  String _balanceText = '';

  void _handleAdd(AccountsStore store) {
    final balance = double.tryParse(_balanceText);
    if (_name.isEmpty || balance == null) return;
    store.addAccount(name: _name, type: 'checking', balance: balance);
    setState(() {
      _name = '';
      _balanceText = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final accountsStore = context.watch<AccountsStore>();
    final accounts = accountsStore.accounts;

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          const Text('Add your accounts', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          const Text('Add at least one account to get started. You can add more or edit later.', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: AppSpacing.xl),
          if (accounts.isNotEmpty)
            AppCard(
              margin: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: Column(
                children: [
                  for (var i = 0; i < accounts.length; i++)
                    ListRow(
                      icon: const Icon(LucideIcons.wallet, size: 16, color: AppColors.textSecondary),
                      title: accounts[i].name,
                      amount: accounts[i].balance,
                      isLast: i == accounts.length - 1,
                    ),
                ],
              ),
            ),
          AppFormField(label: 'Account name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. NCB Checking'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(
            label: 'Balance (J\$)',
            value: _balanceText,
            onChanged: (v) => setState(() => _balanceText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Add Account',
            variant: AppButtonVariant.secondary,
            onPressed: (_name.isNotEmpty && _balanceText.isNotEmpty) ? () => _handleAdd(accountsStore) : null,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Continue', onPressed: accounts.isNotEmpty ? () => context.push('/onboarding/income') : null),
        ],
      ),
    );
  }
}
