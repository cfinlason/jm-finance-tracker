import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../supabase_config.dart';
import 'error_banner_store.dart';

class TransactionsStore extends ChangeNotifier {
  static const _table = 'transactions';
  final ErrorBannerStore errorBanner;

  TransactionsStore(this.errorBanner);

  List<Transaction> _transactions = [];
  bool _hasHydrated = false;

  List<Transaction> get transactions => List.unmodifiable(_transactions);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    try {
      final rows = await supabase.from(_table).select().order('date');
      _transactions = (rows as List).map((r) => Transaction.fromSupabaseRow(r as Map<String, dynamic>)).toList();
    } catch (_) {
      _transactions = [];
      errorBanner.show("Couldn't load saved data — starting fresh");
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _insert(Transaction transaction) async {
    try {
      await supabase.from(_table).insert(transaction.toSupabaseInsert());
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

  String addTransaction({
    required String accountId,
    required String categoryId,
    required double amount,
    required String note,
    required String date,
    required String type,
    String? recurringRuleId,
    String? goalId,
  }) {
    final id = generateId();
    final transaction = Transaction(
      id: id,
      accountId: accountId,
      categoryId: categoryId,
      amount: amount,
      note: note,
      date: date,
      type: type,
      recurringRuleId: recurringRuleId,
      goalId: goalId,
    );
    _transactions = [..._transactions, transaction];
    notifyListeners();
    _insert(transaction);
    return id;
  }

  void updateTransaction(
    String id, {
    String? accountId,
    String? categoryId,
    double? amount,
    String? note,
    String? date,
    String? type,
    String? goalId,
  }) {
    _transactions = _transactions
        .map((t) => t.id == id
            ? t.copyWith(accountId: accountId, categoryId: categoryId, amount: amount, note: note, date: date, type: type, goalId: goalId)
            : t)
        .toList();
    notifyListeners();
    _update(id, {
      'account_id': ?accountId,
      'category_id': ?categoryId,
      'amount': ?amount,
      'note': ?note,
      'date': ?date,
      'type': ?type,
      'goal_id': ?goalId,
    });
  }

  void removeTransaction(String id) {
    _transactions = _transactions.where((t) => t.id != id).toList();
    notifyListeners();
    _delete(id);
  }

  Future<void> migrateIn(List<Transaction> localTransactions) async {
    if (localTransactions.isEmpty) return;
    _transactions = localTransactions;
    notifyListeners();
    try {
      await supabase.from(_table).insert(localTransactions.map((t) => t.toSupabaseInsert()).toList());
    } catch (_) {
      errorBanner.show("Couldn't finish moving your data to the cloud — try again");
    }
  }
}
