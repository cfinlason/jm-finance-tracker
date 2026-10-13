import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/stores/error_banner_store.dart';
import 'package:jm_finance_tracker/stores/settings_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  SettingsStore make() => SettingsStore(ErrorBannerStore());

  test('setEmergencyMonths clamps to 3-6', () {
    final s = make();
    s.setEmergencyMonths(9);
    expect(s.settings.emergencyMonths, 6);
    s.setEmergencyMonths(1);
    expect(s.settings.emergencyMonths, 3);
  });

  test('raiseStep2Baseline only raises', () {
    final s = make();
    s.raiseStep2Baseline(500);
    s.raiseStep2Baseline(300);
    expect(s.settings.step2StartTotal, 500);
  });

  test('setStepCompleted toggles', () {
    final s = make();
    s.setStepCompleted(4, true);
    expect(s.settings.stepsCompleted[4], true);
    s.setStepCompleted(4, false);
    expect(s.settings.stepsCompleted[4], false);
  });

  test('setStepAmount sets and removes', () {
    final s = make();
    s.setStepAmount(5, 100);
    expect(s.settings.stepAmounts[5], 100);
    s.setStepAmount(5, null);
    expect(s.settings.stepAmounts.containsKey(5), false);
  });

  test('setCachedRate exposes rate and time', () {
    final s = make();
    final t = DateTime.utc(2026, 1, 2);
    s.setCachedRate(160.5, t);
    expect(s.settings.cachedUsdJmdRate, 160.5);
    expect(s.settings.rateUpdatedAt, t.toIso8601String());
  });

  test('starter fund and net worth goal setters', () {
    final s = make();
    s.setStarterFundUsd(2000);
    s.setNetWorthGoalUsd(5000);
    expect(s.settings.starterFundUsd, 2000);
    expect(s.settings.netWorthGoalUsd, 5000);
  });
}
