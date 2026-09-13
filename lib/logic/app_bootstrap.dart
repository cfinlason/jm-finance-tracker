import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';
import '../stores/settings_store.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';
import '../stores/transactions_store.dart';
import '../stores/recurring_store.dart';
import '../stores/goals_store.dart';
import '../stores/debts_store.dart';

/// Fetches every data store's contents for the current session. Called
/// once right after a successful sign-in/sign-up, and again on cold start
/// if a session is already active (see main.dart).
Future<void> hydrateAllStores(BuildContext context) {
  return Future.wait([
    context.read<SettingsStore>().hydrate(),
    context.read<AccountsStore>().hydrate(),
    context.read<CategoriesStore>().hydrate(),
    context.read<TransactionsStore>().hydrate(),
    context.read<RecurringStore>().hydrate(),
    context.read<GoalsStore>().hydrate(),
    context.read<DebtsStore>().hydrate(),
  ]);
}
