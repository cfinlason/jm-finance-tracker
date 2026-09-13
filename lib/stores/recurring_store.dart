import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/date_utils.dart' as date_utils;
import '../supabase_config.dart';
import 'error_banner_store.dart';

class RecurringStore extends ChangeNotifier {
  static const _table = 'recurring_rules';
  final ErrorBannerStore errorBanner;

  RecurringStore(this.errorBanner);

  List<RecurringRule> _rules = [];
  bool _hasHydrated = false;

  List<RecurringRule> get rules => List.unmodifiable(_rules);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    try {
      final rows = await supabase.from(_table).select().order('next_due_date');
      _rules = (rows as List).map((r) => RecurringRule.fromSupabaseRow(r as Map<String, dynamic>)).toList();
    } catch (_) {
      _rules = [];
      errorBanner.show("Couldn't load saved data — starting fresh");
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _insert(RecurringRule rule) async {
    try {
      await supabase.from(_table).insert(rule.toSupabaseInsert());
    } catch (_) {
      errorBanner.show("Couldn't save — try again");
    }
  }

  Future<void> _update(String id, Map<String, dynamic> patch) async {
    try {
      await supabase.from(_table).update(patch).eq('id', id);
    } catch (_) {
      errorBanner.show("Couldn't save — try again");
    }
  }

  Future<void> _delete(String id) async {
    try {
      await supabase.from(_table).delete().eq('id', id);
    } catch (_) {
      errorBanner.show("Couldn't delete — try again");
    }
  }

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
    _insert(rule);
    return id;
  }

  void updateRule(String id, {String? name, double? amount, String? frequency, String? nextDueDate}) {
    _rules = _rules.map((r) => r.id == id ? r.copyWith(name: name, amount: amount, frequency: frequency, nextDueDate: nextDueDate) : r).toList();
    notifyListeners();
    _update(id, {
      'name': ?name,
      'amount': ?amount,
      'frequency': ?frequency,
      'next_due_date': ?nextDueDate,
    });
  }

  void removeRule(String id) {
    _rules = _rules.where((r) => r.id != id).toList();
    notifyListeners();
    _delete(id);
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

  Future<void> migrateIn(List<RecurringRule> localRules) async {
    if (localRules.isEmpty) return;
    _rules = localRules;
    notifyListeners();
    try {
      await supabase.from(_table).insert(localRules.map((r) => r.toSupabaseInsert()).toList());
    } catch (_) {
      errorBanner.show("Couldn't finish moving your data to the cloud — try again");
    }
  }
}
