import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/date_utils.dart' as date_utils;
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class RecurringStore extends ChangeNotifier {
  static const _key = 'recurring-store';
  final ErrorBannerStore errorBanner;

  RecurringStore(this.errorBanner);

  List<RecurringRule> _rules = [];
  bool _hasHydrated = false;

  List<RecurringRule> get rules => List.unmodifiable(_rules);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _rules = list.map((e) => RecurringRule.fromJson(e as Map<String, dynamic>)).toList();
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_rules.map((r) => r.toJson()).toList()), errorBanner);

  String addRule({
    required String name,
    required String categoryId,
    required String accountId,
    required double amount,
    required String frequency,
    required String nextDueDate,
  }) {
    final id = generateId();
    final rule = RecurringRule(
      id: id,
      name: name,
      categoryId: categoryId,
      accountId: accountId,
      amount: amount,
      frequency: frequency,
      nextDueDate: nextDueDate,
    );
    _rules = [..._rules, rule];
    notifyListeners();
    _persist();
    return id;
  }

  void updateRule(String id, {String? name, double? amount, String? frequency, String? nextDueDate}) {
    _rules = _rules.map((r) => r.id == id ? r.copyWith(name: name, amount: amount, frequency: frequency, nextDueDate: nextDueDate) : r).toList();
    notifyListeners();
    _persist();
  }

  void removeRule(String id) {
    _rules = _rules.where((r) => r.id != id).toList();
    notifyListeners();
    _persist();
  }

  void advanceNextDueDate(String id) {
    RecurringRule? rule;
    for (final r in _rules) {
      if (r.id == id) {
        rule = r;
        break;
      }
    }
    if (rule == null) return;
    final next = date_utils.nextOccurrence(DateTime.parse(rule.nextDueDate), rule.frequency);
    updateRule(id, nextDueDate: next.toIso8601String());
  }
}
