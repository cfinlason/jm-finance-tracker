import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import 'app_router.dart';
import 'theme/app_theme.dart';
import 'widgets/error_banner.dart';

import 'stores/error_banner_store.dart';
import 'stores/settings_store.dart';
import 'stores/accounts_store.dart';
import 'stores/categories_store.dart';
import 'stores/transactions_store.dart';
import 'stores/recurring_store.dart';
import 'stores/goals_store.dart';
import 'stores/debts_store.dart';

void main() {
  runApp(const AppRoot());
}

class AppRoot extends StatelessWidget {
  const AppRoot({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ErrorBannerStore()),
        ChangeNotifierProvider(create: (context) => SettingsStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => AccountsStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => CategoriesStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => TransactionsStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => RecurringStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => GoalsStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => DebtsStore(context.read<ErrorBannerStore>())..hydrate()),
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

  @override
  void initState() {
    super.initState();
    final refresh = Listenable.merge([
      context.read<SettingsStore>(),
      context.read<AccountsStore>(),
      context.read<CategoriesStore>(),
      context.read<TransactionsStore>(),
      context.read<RecurringStore>(),
      context.read<GoalsStore>(),
      context.read<DebtsStore>(),
    ]);
    _router = buildAppRouter(refreshListenable: refresh);
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
