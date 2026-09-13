import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../supabase_config.dart';
import 'error_banner_store.dart';

class AccountsStore extends ChangeNotifier {
  static const _table = 'accounts';
  final ErrorBannerStore errorBanner;

  AccountsStore(this.errorBanner);

  List<Account> _accounts = [];
  bool _hasHydrated = false;

  List<Account> get accounts => List.unmodifiable(_accounts);
  bool get hasHydrated => _hasHydrated;

  /// Fetches this user's accounts from Supabase. Safe to call before a
  /// session exists (e.g. app startup, or in tests with no Supabase
  /// session) — RLS returns zero rows for an unauthenticated request rather
  /// than erroring, and any other failure (network, not-initialized) is
  /// caught so this never throws.
  Future<void> hydrate() async {
    try {
      final rows = await supabase.from(_table).select().order('created_at');
      _accounts = (rows as List).map((r) => Account.fromSupabaseRow(r as Map<String, dynamic>)).toList();
    } catch (_) {
      _accounts = [];
      errorBanner.show("Couldn't load saved data — starting fresh");
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _insert(Account account) async {
    try {
      await supabase.from(_table).insert(account.toSupabaseInsert());
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

  String addAccount({required String name, required String type, required double balance}) {
    final id = generateId();
    final account = Account(id: id, name: name, type: type, balance: balance, createdAt: DateTime.now().toIso8601String());
    _accounts = [..._accounts, account];
    notifyListeners();
    _insert(account);
    return id;
  }

  void updateAccount(String id, {String? name, String? type, double? balance}) {
    _accounts = _accounts.map((a) => a.id == id ? a.copyWith(name: name, type: type, balance: balance) : a).toList();
    notifyListeners();
    _update(id, {
      'name': ?name,
      'type': ?type,
      'balance': ?balance,
    });
  }

  void removeAccount(String id) {
    _accounts = _accounts.where((a) => a.id != id).toList();
    notifyListeners();
    _delete(id);
  }

  /// Bulk-inserts accounts already carrying their local ids, used by the
  /// one-time local-data migration (lib/logic/cloud_migration.dart). Skips
  /// the network round-trip if there's nothing to migrate.
  Future<void> migrateIn(List<Account> localAccounts) async {
    if (localAccounts.isEmpty) return;
    _accounts = localAccounts;
    notifyListeners();
    try {
      await supabase.from(_table).insert(localAccounts.map((a) => a.toSupabaseInsert()).toList());
    } catch (_) {
      errorBanner.show("Couldn't finish moving your data to the cloud — try again");
    }
  }
}
