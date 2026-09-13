import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'stores/auth_store.dart';
import 'stores/settings_store.dart';
import 'stores/accounts_store.dart';
import 'stores/categories_store.dart';
import 'stores/transactions_store.dart';
import 'stores/recurring_store.dart';
import 'stores/goals_store.dart';
import 'stores/debts_store.dart';

import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/onboarding/welcome_screen.dart';
import 'screens/onboarding/accounts_screen.dart';
import 'screens/onboarding/income_screen.dart';
import 'screens/onboarding/recurring_screen.dart';
import 'screens/onboarding/goals_screen.dart';
import 'screens/onboarding/done_screen.dart';
import 'screens/home_screen.dart';
import 'screens/transactions_screen.dart';
import 'screens/insights_screen.dart';
import 'screens/goals_list_screen.dart';
import 'screens/more_screen.dart';
import 'screens/debt_screen.dart';
import 'screens/cash_flow_screen.dart';
import 'screens/accounts_management_screen.dart';
import 'screens/categories_screen.dart';
import 'screens/recurring_management_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/settings_screen.dart';

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
      final isAuthRoute = state.matchedLocation.startsWith('/auth');
      final isSignedIn = context.read<AuthStore>().isSignedIn;

      if (!isSignedIn) {
        return isAuthRoute ? null : '/auth/login';
      }
      // Signed in but on an auth screen (e.g. just completed sign-in/up, or
      // navigated back to it manually) — send onward once data is ready.
      if (isAuthRoute && !_allHydrated(context)) {
        return null;
      }

      if (!_allHydrated(context)) {
        return state.matchedLocation == '/' ? null : '/';
      }

      final hasCompletedOnboarding = context.read<SettingsStore>().hasCompletedOnboarding;
      final isOnboardingRoute = state.matchedLocation.startsWith('/onboarding');

      if (state.matchedLocation == '/' || isAuthRoute) {
        return hasCompletedOnboarding ? '/home' : '/onboarding/welcome';
      }
      if (!hasCompletedOnboarding && !isOnboardingRoute) {
        return '/onboarding/welcome';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const LoadingState()),

      // Auth routes
      GoRoute(path: '/auth/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/auth/signup', builder: (context, state) => const SignupScreen()),

      // Onboarding routes
      GoRoute(path: '/onboarding/welcome', builder: (context, state) => const WelcomeScreen()),
      GoRoute(path: '/onboarding/accounts', builder: (context, state) => const OnboardingAccountsScreen()),
      GoRoute(path: '/onboarding/income', builder: (context, state) => const OnboardingIncomeScreen()),
      GoRoute(path: '/onboarding/recurring', builder: (context, state) => const OnboardingRecurringScreen()),
      GoRoute(path: '/onboarding/goals', builder: (context, state) => const OnboardingGoalsScreen()),
      GoRoute(path: '/onboarding/done', builder: (context, state) => const OnboardingDoneScreen()),

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

      // Pushed routes (outside the tab shell)
      GoRoute(path: '/debts', builder: (context, state) => const DebtScreen()),
      GoRoute(path: '/cash-flow', builder: (context, state) => const CashFlowScreen()),
      GoRoute(path: '/accounts', builder: (context, state) => const AccountsManagementScreen()),
      GoRoute(path: '/categories', builder: (context, state) => const CategoriesScreen()),
      GoRoute(path: '/recurring', builder: (context, state) => const RecurringManagementScreen()),
      GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
      GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
    ],
  );
}
