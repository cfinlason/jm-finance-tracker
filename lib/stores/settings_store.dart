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
}
