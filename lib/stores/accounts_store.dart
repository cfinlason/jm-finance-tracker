import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class AccountsStore extends ChangeNotifier {
  static const _key = 'accounts-store';
  final ErrorBannerStore errorBanner;

  AccountsStore(this.errorBanner);

  List<Account> _accounts = [];
  bool _hasHydrated = false;

  List<Account> get accounts => List.unmodifiable(_accounts);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      try {
        final list = jsonDecode(raw) as List<dynamic>;
        _accounts = list.map((e) => Account.fromJson(e as Map<String, dynamic>)).toList();
      } catch (_) {
        _accounts = [];
        errorBanner.show("Couldn't load saved data — starting fresh");
      }
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_accounts.map((a) => a.toJson()).toList()), errorBanner);

  String addAccount({required String name, required String type, required double balance}) {
    final id = generateId();
    final account = Account(id: id, name: name, type: type, balance: balance, createdAt: DateTime.now().toIso8601String());
    _accounts = [..._accounts, account];
    notifyListeners();
    _persist();
    return id;
  }

  void updateAccount(String id, {String? name, String? type, double? balance}) {
    _accounts = _accounts.map((a) => a.id == id ? a.copyWith(name: name, type: type, balance: balance) : a).toList();
    notifyListeners();
    _persist();
  }

  void removeAccount(String id) {
    _accounts = _accounts.where((a) => a.id != id).toList();
    notifyListeners();
    _persist();
  }
}
