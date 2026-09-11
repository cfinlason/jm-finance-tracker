import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_form_field.dart';
import '../../widgets/app_button.dart';
import '../../stores/settings_store.dart';

class OnboardingIncomeScreen extends StatefulWidget {
  const OnboardingIncomeScreen({super.key});

  @override
  State<OnboardingIncomeScreen> createState() => _OnboardingIncomeScreenState();
}

class _OnboardingIncomeScreenState extends State<OnboardingIncomeScreen> {
  String _incomeText = '';

  void _handleContinue() {
    final income = double.tryParse(_incomeText);
    if (income != null) {
      context.read<SettingsStore>().setMonthlyIncomeEstimate(income);
    }
    context.push('/onboarding/recurring');
  }

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          const Text('Estimate your monthly income', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          const Text('This helps calculate your Safe to Spend figure.', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: AppSpacing.xl),
          AppFormField(
            label: 'Monthly income (J\$)',
            value: _incomeText,
            onChanged: (v) => setState(() => _incomeText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            placeholder: '0.00',
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Continue', onPressed: _incomeText.isNotEmpty ? _handleContinue : null),
        ],
      ),
    );
  }
}
