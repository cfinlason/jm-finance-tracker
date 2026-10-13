import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/settings_store.dart';
import '../stores/exchange_rate_store.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _incomeText = '';
  String _starterText = '';
  String _goalText = '';
  bool _initialized = false;
  late final SettingsStore _store;
  Timer? _starterTimer;
  Timer? _goalTimer;

  @override
  void initState() {
    super.initState();
    _store = context.read<SettingsStore>();
  }

  @override
  void dispose() {
    final starterPending = _starterTimer?.isActive ?? false;
    final goalPending = _goalTimer?.isActive ?? false;
    _starterTimer?.cancel();
    _goalTimer?.cancel();
    if (starterPending) _commitStarter();
    if (goalPending) _commitGoal();
    super.dispose();
  }

  void _commitStarter() {
    final n = _parsePositive(_starterText);
    if (n != null) _store.setStarterFundUsd(n);
  }

  void _commitGoal() {
    final n = _parsePositive(_goalText);
    if (n != null) _store.setNetWorthGoalUsd(n);
  }

  static double? _parsePositive(String t) {
    final v = double.tryParse(t.trim());
    return (v != null && v.isFinite && v > 0) ? v : null;
  }

  static String _fmt(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();

  static String _asOf(DateTime t) {
    final l = t.toLocal();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${l.year}-${two(l.month)}-${two(l.day)} ${two(l.hour)}:${two(l.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    final settingsStore = context.watch<SettingsStore>();

    if (!_initialized) {
      _incomeText = settingsStore.monthlyIncomeEstimate.toString();
      _starterText = _fmt(settingsStore.settings.starterFundUsd);
      _goalText = _fmt(settingsStore.settings.netWorthGoalUsd);
      _initialized = true;
    }

    final income = double.tryParse(_incomeText);
    final isValid = income != null && income > 0;

    void handleSave() {
      if (!isValid) return;
      context.read<SettingsStore>().setMonthlyIncomeEstimate(income);
    }

    final rateStore = context.watch<ExchangeRateStore>();
    final starterValid = _parsePositive(_starterText) != null;
    final goalValid = _parsePositive(_goalText) != null;
    final rate = rateStore.rate;
    final at = rateStore.updatedAt;
    final rateLine = rate == null ? 'No rate yet' : 'US\$1 = J\$${rate.toStringAsFixed(2)}${at == null ? '' : ' · as of ${_asOf(at)}'}';

    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Settings', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.sm),
            const Text('Income, Baby Steps targets and exchange rate.', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
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
            const SizedBox(height: AppSpacing.xxl),
            AppFormField(
              label: 'Starter fund (US\$)',
              value: _starterText,
              onChanged: (v) {
                setState(() => _starterText = v);
                _starterTimer?.cancel();
                _starterTimer = Timer(const Duration(milliseconds: 500), _commitStarter);
              },
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              placeholder: '1000',
              error: starterValid ? null : 'Enter an amount greater than 0',
            ),
            const SizedBox(height: AppSpacing.xl),
            const Text('EMERGENCY FUND (MONTHS OF EXPENSES)', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
            const SizedBox(height: AppSpacing.xs),
            AppSegmentedControl<int>(
              options: [for (final m in [3, 4, 5, 6]) SegmentOption(label: '$m', value: m)],
              value: settingsStore.settings.emergencyMonths,
              onChanged: (m) => context.read<SettingsStore>().setEmergencyMonths(m),
            ),
            const SizedBox(height: AppSpacing.xl),
            AppFormField(
              label: 'Net worth goal (US\$)',
              value: _goalText,
              onChanged: (v) {
                setState(() => _goalText = v);
                _goalTimer?.cancel();
                _goalTimer = Timer(const Duration(milliseconds: 500), _commitGoal);
              },
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              placeholder: '1000000',
              error: goalValid ? null : 'Enter an amount greater than 0',
            ),
            const SizedBox(height: AppSpacing.xl),
            const Text('EXCHANGE RATE (USD TO JMD)', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
            const SizedBox(height: AppSpacing.xs),
            Text(rateLine, style: const TextStyle(color: AppColors.text, fontSize: 15)),
            if (rateStore.refreshFailed)
              const Padding(
                padding: EdgeInsets.only(top: 4),
                child: Text("Couldn't refresh the rate — showing the last known value", style: TextStyle(color: AppColors.warning, fontSize: 12)),
              ),
            const SizedBox(height: AppSpacing.md),
            AppButton(
              label: 'Refresh rate',
              variant: AppButtonVariant.secondary,
              loading: rateStore.isLoading,
              onPressed: () => context.read<ExchangeRateStore>().refresh(),
            ),
          ],
        ),
      ),
    );
  }
}
