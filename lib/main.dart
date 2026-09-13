import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import 'app_router.dart';
import 'theme/app_theme.dart';
import 'widgets/error_banner.dart';
import 'supabase_config.dart';
import 'logic/app_bootstrap.dart';
import 'logic/cloud_migration.dart';

import 'stores/error_banner_store.dart';
import 'stores/auth_store.dart';
import 'stores/settings_store.dart';
import 'stores/accounts_store.dart';
import 'stores/categories_store.dart';
import 'stores/transactions_store.dart';
import 'stores/recurring_store.dart';
import 'stores/goals_store.dart';
import 'stores/debts_store.dart';
import 'stores/transaction_preview_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initSupabase();
  runApp(const AppRoot());
}

class AppRoot extends StatelessWidget {
  const AppRoot({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ErrorBannerStore()),
        ChangeNotifierProvider(create: (_) => AuthStore()),
        ChangeNotifierProvider(create: (context) => SettingsStore(context.read<ErrorBannerStore>())),
        ChangeNotifierProvider(create: (context) => AccountsStore(context.read<ErrorBannerStore>())),
        ChangeNotifierProvider(create: (context) => CategoriesStore(context.read<ErrorBannerStore>())),
        ChangeNotifierProvider(create: (context) => TransactionsStore(context.read<ErrorBannerStore>())),
        ChangeNotifierProvider(create: (context) => RecurringStore(context.read<ErrorBannerStore>())),
        ChangeNotifierProvider(create: (context) => GoalsStore(context.read<ErrorBannerStore>())),
        ChangeNotifierProvider(create: (context) => DebtsStore(context.read<ErrorBannerStore>())),
        ChangeNotifierProvider(create: (_) => TransactionPreviewStore()),
      ],
      child: const _RouterHost(),
    );
  }
}

class _RouterHost extends StatefulWidget {
  const _RouterHost();

  @override
  State<_RouterHost> createState() => _RouterHostState();
}

class _RouterHostState extends State<_RouterHost> {
  late final GoRouter _router;
  late final AuthStore _authStore;
  String? _bootstrappedForUserId;

  @override
  void initState() {
    super.initState();
    _authStore = context.read<AuthStore>();
    final refresh = Listenable.merge([
      _authStore,
      context.read<SettingsStore>(),
      context.read<AccountsStore>(),
      context.read<CategoriesStore>(),
      context.read<TransactionsStore>(),
      context.read<RecurringStore>(),
      context.read<GoalsStore>(),
      context.read<DebtsStore>(),
    ]);
    _router = buildAppRouter(refreshListenable: refresh);
    _authStore.addListener(_maybeBootstrap);
    _maybeBootstrap();
  }

  /// Runs once per signed-in session: migrates any local data left over
  /// from before cloud accounts existed (a no-op for a returning user, or a
  /// brand-new account whose browser never had local data), then fetches
  /// every store's contents from Supabase. Guarded by user id so repeated
  /// auth-state notifications (token refresh, etc.) don't re-run it, and
  /// resets on sign-out so the next sign-in re-bootstraps.
  void _maybeBootstrap() {
    final userId = _authStore.userId;
    if (userId == null) {
      _bootstrappedForUserId = null;
      return;
    }
    if (_bootstrappedForUserId == userId) return;
    _bootstrappedForUserId = userId;

    () async {
      await migrateLocalDataToCloud(
        accountsStore: context.read<AccountsStore>(),
        categoriesStore: context.read<CategoriesStore>(),
        transactionsStore: context.read<TransactionsStore>(),
        recurringStore: context.read<RecurringStore>(),
        goalsStore: context.read<GoalsStore>(),
        debtsStore: context.read<DebtsStore>(),
        settingsStore: context.read<SettingsStore>(),
      );
      if (!mounted) return;
      await hydrateAllStores(context);
    }();
  }

  @override
  void dispose() {
    _authStore.removeListener(_maybeBootstrap);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'JM Finance Tracker',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: _router,
      builder: (context, child) {
        return ColoredBox(
          color: AppColors.bg,
          child: Stack(
            children: [
              ?child,
              const ErrorBanner(),
            ],
          ),
        );
      },
    );
  }
}
