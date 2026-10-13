import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'settings_store.dart';

Future<double> _defaultFetcher() async {
  final res = await http
      .get(Uri.parse('https://open.er-api.com/v6/latest/USD'))
      .timeout(const Duration(seconds: 10));
  if (res.statusCode != 200) {
    throw Exception('Rate fetch failed: ${res.statusCode}');
  }
  final body = jsonDecode(res.body) as Map<String, dynamic>;
  final jmd = (body['rates'] as Map<String, dynamic>?)?['JMD'];
  if (jmd is! num) throw Exception('JMD rate missing');
  return jmd.toDouble();
}

class ExchangeRateStore extends ChangeNotifier {
  final SettingsStore settings;
  final Future<double> Function() _fetcher;

  ExchangeRateStore(this.settings, {Future<double> Function()? fetcher})
      : _fetcher = fetcher ?? _defaultFetcher;

  double? _rate;
  DateTime? _updatedAt;
  bool _refreshFailed = false;
  bool _isLoading = false;

  double? get rate => _rate;
  DateTime? get updatedAt => _updatedAt;
  bool get refreshFailed => _refreshFailed;
  bool get isLoading => _isLoading;

  void loadCached() {
    final s = settings.settings;
    _rate = s.cachedUsdJmdRate;
    final iso = s.rateUpdatedAt;
    _updatedAt = iso == null ? null : DateTime.tryParse(iso);
    notifyListeners();
  }

  Future<void> refresh() async {
    _isLoading = true;
    notifyListeners();
    try {
      final r = await _fetcher();
      final now = DateTime.now().toUtc();
      _rate = r;
      _updatedAt = now;
      _refreshFailed = false;
      settings.setCachedRate(r, now);
    } catch (_) {
      _refreshFailed = true;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
