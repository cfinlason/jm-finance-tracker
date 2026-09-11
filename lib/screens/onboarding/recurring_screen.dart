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
import '../../stores/recurring_store.dart';
import '../../stores/accounts_store.dart';
import '../../stores/categories_store.dart';

class OnboardingRecurringScreen extends StatefulWidget {
  const OnboardingRecurringScreen({super.key});

  @override
  State<OnboardingRecurringScreen> createState() => _OnboardingRecurringScreenState();
}

class _OnboardingRecurringScreenState extends State<OnboardingRecurringScreen> {
  String _name = '';
  String _amountText = '';

  void _handleAdd(RecurringStore store, AccountsStore accountsStore, CategoriesStore categoriesStore) {
    final amount = double.tryParse(_amountText);
    if (_name.isEmpty || amount == null || accountsStore.accounts.isEmpty || categoriesStore.categories.isEmpty) return;
    store.addRule(
      name: _name,
      amount: amount,
      frequency: 'monthly',
      accountId: accountsStore.accounts[0].id,
      categoryId: categoriesStore.categories[0].id,
      nextDueDate: DateTime.now().toIso8601String(),
    );
    setState(() {
      _name = '';
      _amountText = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final recurringStore = context.watch<RecurringStore>();
    final accountsStore = context.watch<AccountsStore>();
    final categoriesStore = context.watch<CategoriesStore>();
    final rules = recurringStore.rules;

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          const Text('Recurring bills', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          const Text('Add any regular bills. You can skip this and add them later.', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: AppSpacing.xl),
          if (rules.isNotEmpty)
            AppCard(
              margin: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: Column(
                children: [
                  for (var i = 0; i < rules.length; i++)
                    ListRow(icon: const Icon(LucideIcons.repeat, size: 16, color: AppColors.textSecondary), title: rules[i].name, amount: -rules[i].amount, isLast: i == rules.length - 1),
                ],
              ),
            ),
          AppFormField(label: 'Bill name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Rent'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(
            label: 'Amount (J\$)',
            value: _amountText,
            onChanged: (v) => setState(() => _amountText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Add Bill',
            variant: AppButtonVariant.secondary,
            onPressed: (_name.isNotEmpty && _amountText.isNotEmpty) ? () => _handleAdd(recurringStore, accountsStore, categoriesStore) : null,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Continue', onPressed: () => context.push('/onboarding/goals')),
        ],
      ),
    );
  }
}
