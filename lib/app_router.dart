import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'stores/settings_store.dart';
import 'stores/accounts_store.dart';
import 'stores/categories_store.dart';
import 'stores/transactions_store.dart';
import 'stores/recurring_store.dart';
import 'stores/goals_store.dart';
import 'stores/debts_store.dart';

import 'screens/onboarding/welcome_screen.dart';
import 'screens/home_screen.dart';
import 'screens/transactions_screen.dart';
import 'screens/insights_screen.dart';
import 'screens/goals_list_screen.dart';
import 'screens/more_screen.dart';

import 'widgets/loading_state.dart';
import 'widgets/main_shell.dart';

bool _allHydrated(BuildContext context) {
  return context.read<SettingsStore>().hasHydrated &&
      context.read<AccountsStore>().hasHydrated &&
      context.read<CategoriesStore>().hasHydrated &&
      context.read<TransactionsStore>().hasHydrated &&
      context.read<RecurringStore>().hasHydrated &&
      context.read<GoalsStore>().hasHydrated &&
      context.read<DebtsStore>().hasHydrated;
}

GoRouter buildAppRouter({required Listenable refreshListenable}) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      if (!_allHydrated(context)) {
        return state.matchedLocation == '/' ? null : '/';
      }
      final hasCompletedOnboarding = context.read<SettingsStore>().hasCompletedOnboarding;
      final isOnboardingRoute = state.matchedLocation.startsWith('/onboarding');

      if (state.matchedLocation == '/') {
        return hasCompletedOnboarding ? '/home' : '/onboarding/welcome';
      }
      if (!hasCompletedOnboarding && !isOnboardingRoute) {
        return '/onboarding/welcome';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const LoadingState()),

      // ONBOARDING ROUTES — Tasks 14-16 add the remaining 5 GoRoute entries here
      GoRoute(path: '/onboarding/welcome', builder: (context, state) => const WelcomeScreen()),

      // TAB SHELL
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/home', builder: (context, state) => const HomeScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/transactions', builder: (context, state) => const TransactionsScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/insights', builder: (context, state) => const InsightsScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/goals', builder: (context, state) => const GoalsListScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/more', builder: (context, state) => const MoreScreen())]),
        ],
      ),

      // PUSHED ROUTES — Tasks 19, 21, 22, 23, 24, 25, 26 add their GoRoute entries here
    ],
  );
}
