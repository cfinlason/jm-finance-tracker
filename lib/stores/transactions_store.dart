import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class TransactionsStore extends ChangeNotifier {
  static const _key = 'transactions-store';
  final ErrorBannerStore errorBanner;

  TransactionsStore(this.errorBanner);

  List<Transaction> _transactions = [];
  bool _hasHydrated = false;

  List<Transaction> get transactions => List.unmodifiable(_transactions);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      try {
        final list = jsonDecode(raw) as List<dynamic>;
        _transactions = list.map((e) => Transaction.fromJson(e as Map<String, dynamic>)).toList();
      } catch (_) {
        _transactions = [];
        errorBanner.show("Couldn't load saved data — starting fresh");
      }
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_transactions.map((t) => t.toJson()).toList()), errorBanner);

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
    _persist();
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
    _persist();
  }

  void removeTransaction(String id) {
    _transactions = _transactions.where((t) => t.id != id).toList();
    notifyListeners();
    _persist();
  }
}
