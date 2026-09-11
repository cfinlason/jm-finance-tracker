import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class DebtsStore extends ChangeNotifier {
  static const _key = 'debts-store';
  final ErrorBannerStore errorBanner;

  DebtsStore(this.errorBanner);

  List<Debt> _debts = [];
  bool _hasHydrated = false;

  List<Debt> get debts => List.unmodifiable(_debts);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      try {
        final list = jsonDecode(raw) as List<dynamic>;
        _debts = list.map((e) => Debt.fromJson(e as Map<String, dynamic>)).toList();
      } catch (_) {
        _debts = [];
        errorBanner.show("Couldn't load saved data — starting fresh");
      }
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_debts.map((d) => d.toJson()).toList()), errorBanner);

  String addDebt({
    required String name,
    required double balance,
    required double interestRate,
    required double minPayment,
    required int dueDayOfMonth,
  }) {
    final id = generateId();
    final debt = Debt(id: id, name: name, balance: balance, interestRate: interestRate, minPayment: minPayment, dueDayOfMonth: dueDayOfMonth);
    _debts = [..._debts, debt];
    notifyListeners();
    _persist();
    return id;
  }

  void updateDebt(String id, {String? name, double? balance, double? interestRate, double? minPayment}) {
    _debts = _debts.map((d) => d.id == id ? d.copyWith(name: name, balance: balance, interestRate: interestRate, minPayment: minPayment) : d).toList();
    notifyListeners();
    _persist();
  }

  void removeDebt(String id) {
    _debts = _debts.where((d) => d.id != id).toList();
    notifyListeners();
    _persist();
  }
}
