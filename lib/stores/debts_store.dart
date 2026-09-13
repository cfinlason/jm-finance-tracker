import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../supabase_config.dart';
import 'error_banner_store.dart';

class DebtsStore extends ChangeNotifier {
  static const _table = 'debts';
  final ErrorBannerStore errorBanner;

  DebtsStore(this.errorBanner);

  List<Debt> _debts = [];
  bool _hasHydrated = false;

  List<Debt> get debts => List.unmodifiable(_debts);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    try {
      final rows = await supabase.from(_table).select().order('created_at');
      _debts = (rows as List).map((r) => Debt.fromSupabaseRow(r as Map<String, dynamic>)).toList();
    } catch (_) {
      _debts = [];
      errorBanner.show("Couldn't load saved data — starting fresh");
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _insert(Debt debt) async {
    try {
      await supabase.from(_table).insert(debt.toSupabaseInsert());
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
    _insert(debt);
    return id;
  }

  void updateDebt(
    String id, {
    String? name,
    double? balance,
    double? interestRate,
    double? minPayment,
    int? dueDayOfMonth,
    String? recurringRuleId,
  }) {
    _debts = _debts
        .map((d) => d.id == id
            ? d.copyWith(
                name: name,
                balance: balance,
                interestRate: interestRate,
                minPayment: minPayment,
                dueDayOfMonth: dueDayOfMonth,
                recurringRuleId: recurringRuleId,
              )
            : d)
        .toList();
    notifyListeners();
    _update(id, {
      'name': ?name,
      'balance': ?balance,
      'interest_rate': ?interestRate,
      'min_payment': ?minPayment,
      'due_day_of_month': ?dueDayOfMonth,
      'recurring_rule_id': ?recurringRuleId,
    });
  }

  void removeDebt(String id) {
    _debts = _debts.where((d) => d.id != id).toList();
    notifyListeners();
    _delete(id);
  }

  Future<void> migrateIn(List<Debt> localDebts) async {
    if (localDebts.isEmpty) return;
    _debts = localDebts;
    notifyListeners();
    try {
      await supabase.from(_table).insert(localDebts.map((d) => d.toSupabaseInsert()).toList());
    } catch (_) {
      errorBanner.show("Couldn't finish moving your data to the cloud — try again");
    }
  }
}
