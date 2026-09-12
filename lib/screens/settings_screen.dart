import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../stores/settings_store.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _incomeText = '';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final settingsStore = context.watch<SettingsStore>();

    if (!_initialized) {
      _incomeText = settingsStore.monthlyIncomeEstimate.toString();
      _initialized = true;
    }

    final income = double.tryParse(_incomeText);
    final isValid = income != null && income > 0;

    void handleSave() {
      if (!isValid) return;
      context.read<SettingsStore>().setMonthlyIncomeEstimate(income);
      context.pop();
    }

    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Settings', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.sm),
            const Text('Update your estimated monthly income used for Safe to Spend.', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
            const SizedBox(height: AppSpacing.xl),
            AppFormField(
              label: 'Monthly income (J\$)',
              value: _incomeText,
              onChanged: (v) => setState(() => _incomeText = v),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              placeholder: '0.00',
            ),
            const SizedBox(height: AppSpacing.xl),
            AppButton(label: 'Save', onPressed: isValid ? handleSave : null),
          ],
        ),
      ),
    );
  }
}
