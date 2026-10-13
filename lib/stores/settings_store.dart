import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../supabase_config.dart';
import 'error_banner_store.dart';

class SettingsStore extends ChangeNotifier {
  static const _table = 'settings';
  final ErrorBannerStore errorBanner;

  SettingsStore(this.errorBanner);

  UserSettings _settings = UserSettings();
  bool _hasHydrated = false;

  UserSettings get settings => _settings;
  bool get hasHydrated => _hasHydrated;
  bool get hasCompletedOnboarding => _settings.hasCompletedOnboarding;
  double get monthlyIncomeEstimate => _settings.monthlyIncomeEstimate;

  /// Fetches the current user's settings row. The row itself is created
  /// automatically by a database trigger the moment the account is
  /// created (see the `on_auth_user_created` trigger in the Supabase
  /// project), so this should always find exactly one row once signed in.
  Future<void> hydrate() async {
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) {
        _settings = UserSettings();
      } else {
        final row = await supabase.from(_table).select().eq('user_id', userId).maybeSingle();
        _settings = row != null ? UserSettings.fromSupabaseRow(row) : UserSettings();
      }
    } catch (_) {
      _settings = UserSettings();
      errorBanner.show("Couldn't load saved data — starting fresh");
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist(Map<String, dynamic> patch) async {
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) return;
      await supabase.from(_table).update(patch).eq('user_id', userId);
    } catch (_) {
      errorBanner.show("Couldn't save — try again");
    }
  }

  void setHasCompletedOnboarding(bool value) {
    _settings = _settings.copyWith(hasCompletedOnboarding: value);
    notifyListeners();
    _persist({'has_completed_onboarding': value});
  }

  void setMonthlyIncomeEstimate(double value) {
    _settings = _settings.copyWith(monthlyIncomeEstimate: value);
    notifyListeners();
    _persist({'monthly_income_estimate': value});
  }

  void setStarterFundUsd(double value) {
    _settings = _settings.copyWith(starterFundUsd: value);
    notifyListeners();
    _persist({'starter_fund_usd': value});
  }

  void setEmergencyMonths(int months) {
    final v = months.clamp(3, 6).toInt();
    _settings = _settings.copyWith(emergencyMonths: v);
    notifyListeners();
    _persist({'emergency_months': v});
  }

  void setNetWorthGoalUsd(double value) {
    _settings = _settings.copyWith(netWorthGoalUsd: value);
    notifyListeners();
    _persist({'net_worth_goal_usd': value});
  }

  void setStepCompleted(int step, bool done) {
    final m = {..._settings.stepsCompleted, step: done};
    _settings = _settings.copyWith(stepsCompleted: m);
    notifyListeners();
    _persist({'steps_completed': {for (final e in m.entries) e.key.toString(): e.value}});
  }

  void setStepAmount(int step, double? amount) {
    final m = {..._settings.stepAmounts};
    if (amount == null) {
      m.remove(step);
    } else {
      m[step] = amount;
    }
    _settings = _settings.copyWith(stepAmounts: m);
    notifyListeners();
    _persist({'step_amounts': {for (final e in m.entries) e.key.toString(): e.value}});
  }

  void raiseStep2Baseline(double currentTotal) {
    if (currentTotal <= _settings.step2StartTotal) return;
    _settings = _settings.copyWith(step2StartTotal: currentTotal);
    notifyListeners();
    _persist({'step2_start_total': currentTotal});
  }

  void setCachedRate(double rate, DateTime at) {
    final iso = at.toIso8601String();
    _settings = _settings.copyWith(cachedUsdJmdRate: rate, rateUpdatedAt: iso);
    notifyListeners();
    _persist({'cached_usd_jmd_rate': rate, 'rate_updated_at': iso});
  }
}
