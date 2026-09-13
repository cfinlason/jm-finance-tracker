import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';
import '../stores/transactions_store.dart';
import '../stores/recurring_store.dart';
import '../stores/goals_store.dart';
import '../stores/debts_store.dart';
import '../stores/settings_store.dart';

/// One-time upload of whatever this browser had stored locally (from
/// before cloud accounts existed) into a brand-new Supabase account, so a
/// user who already had real data doesn't have to redo onboarding or
/// re-enter anything. Call this exactly once, right after a successful
/// SIGN-UP (never on a plain sign-in — a returning user's data already
/// lives in the cloud, and re-running this would duplicate it).
///
/// Returns true if there was local data to migrate (the caller should then
/// skip onboarding, since the account already has real data).
Future<bool> migrateLocalDataToCloud({
  required AccountsStore accountsStore,
  required CategoriesStore categoriesStore,
  required TransactionsStore transactionsStore,
  required RecurringStore recurringStore,
  required GoalsStore goalsStore,
  required DebtsStore debtsStore,
  required SettingsStore settingsStore,
}) async {
  final prefs = await SharedPreferences.getInstance();

  List<T> readList<T>(String key, T Function(Map<String, dynamic>) fromJson) {
    final raw = prefs.getString(key);
    if (raw == null) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded.map((e) => fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  final localAccounts = readList('accounts-store', Account.fromJson);
  final localCategories = readList('categories-store', Category.fromJson);
  final localTransactions = readList('transactions-store', Transaction.fromJson);
  final localRules = readList('recurring-store', RecurringRule.fromJson);
  final localGoals = readList('goals-store', Goal.fromJson);
  final localDebts = readList('debts-store', Debt.fromJson);

  UserSettings? localSettings;
  final rawSettings = prefs.getString('settings-store');
  if (rawSettings != null) {
    try {
      localSettings = UserSettings.fromJson(jsonDecode(rawSettings) as Map<String, dynamic>);
    } catch (_) {
      localSettings = null;
    }
  }

  final hasAnyLocalData = localAccounts.isNotEmpty ||
      localCategories.isNotEmpty ||
      localTransactions.isNotEmpty ||
      localRules.isNotEmpty ||
      localGoals.isNotEmpty ||
      localDebts.isNotEmpty;

  if (!hasAnyLocalData) return false;

  await accountsStore.migrateIn(localAccounts);
  await categoriesStore.migrateIn(localCategories);
  await transactionsStore.migrateIn(localTransactions);
  await recurringStore.migrateIn(localRules);
  await goalsStore.migrateIn(localGoals);
  await debtsStore.migrateIn(localDebts);

  // This account already has real data, so it should never see onboarding.
  settingsStore.setHasCompletedOnboarding(true);
  if (localSettings != null && localSettings.monthlyIncomeEstimate > 0) {
    settingsStore.setMonthlyIncomeEstimate(localSettings.monthlyIncomeEstimate);
  }

  // Clear the local copies so a later sign-up from this same browser (e.g.
  // after signing out) doesn't try to migrate the same data again.
  await prefs.remove('accounts-store');
  await prefs.remove('categories-store');
  await prefs.remove('transactions-store');
  await prefs.remove('recurring-store');
  await prefs.remove('goals-store');
  await prefs.remove('debts-store');
  await prefs.remove('settings-store');

  return true;
}
