import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class SettingsStore extends ChangeNotifier {
  static const _key = 'settings-store';
  final ErrorBannerStore errorBanner;

  SettingsStore(this.errorBanner);

  UserSettings _settings = UserSettings();
  bool _hasHydrated = false;

  UserSettings get settings => _settings;
  bool get hasHydrated => _hasHydrated;
  bool get hasCompletedOnboarding => _settings.hasCompletedOnboarding;
  double get monthlyIncomeEstimate => _settings.monthlyIncomeEstimate;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      _settings = UserSettings.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_settings.toJson()), errorBanner);

  void setHasCompletedOnboarding(bool value) {
    _settings = _settings.copyWith(hasCompletedOnboarding: value);
    notifyListeners();
    _persist();
  }

  void setMonthlyIncomeEstimate(double value) {
    _settings = _settings.copyWith(monthlyIncomeEstimate: value);
    notifyListeners();
    _persist();
  }
}
