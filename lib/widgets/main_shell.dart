import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';
import '../stores/auth_store.dart';

class _NavDestination {
  final IconData icon;
  final String label;
  // Index into the StatefulShellRoute's branches list (see app_router.dart)
  // — the single source of truth both shells key off of.
  final int branchIndex;
  const _NavDestination(this.icon, this.label, this.branchIndex);
}

// Keep in sync with app_router.dart's StatefulShellRoute branch order:
// 0 Home, 1 Transactions, 2 Insights, 3 Goals, 4 Recurring, 5 Accounts,
// 6 Categories, 7 Notifications, 8 Settings.
const _homeDestination = _NavDestination(LucideIcons.house, 'Home', 0);
const _transactionsDestination = _NavDestination(LucideIcons.list, 'Transactions', 1);
const _insightsDestination = _NavDestination(LucideIcons.pieChart, 'Insights', 2);
const _goalsDestination = _NavDestination(LucideIcons.target, 'Goals', 3);
const _recurringDestination = _NavDestination(LucideIcons.repeat, 'Recurring', 4);
const _accountsDestination = _NavDestination(LucideIcons.wallet, 'Accounts', 5);
const _categoriesDestination = _NavDestination(LucideIcons.tag, 'Categories', 6);
const _notificationsDestination = _NavDestination(LucideIcons.bell, 'Notifications', 7);
const _settingsDestination = _NavDestination(LucideIcons.settings, 'Settings', 8);

/// Compact (phone) bottom bar: these 4 plus a "More" launcher for the rest.
const _compactMainDestinations = [_homeDestination, _transactionsDestination, _recurringDestination, _goalsDestination];

/// Everything not on the compact bottom bar, reached via the "More" sheet.
const _moreDestinations = [_insightsDestination, _accountsDestination, _categoriesDestination, _notificationsDestination, _settingsDestination];

/// Expanded (desktop) sidebar: every destination, no "More" needed.
const _allDestinations = [
  _homeDestination,
  _transactionsDestination,
  _insightsDestination,
  _goalsDestination,
  _recurringDestination,
  _accountsDestination,
  _categoriesDestination,
  _notificationsDestination,
  _settingsDestination,
];

class MainShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const MainShell({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    if (isExpanded(context)) {
      return _ExpandedShell(navigationShell: navigationShell);
    }
    return _CompactShell(navigationShell: navigationShell);
  }
}

void _showMoreSheet(BuildContext context, StatefulNavigationShell navigationShell) {
  showModalBottomSheet(
    context: context,
    backgroundColor: AppColors.bg,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg))),
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
              child: Text('More', style: AppTypography.subHeader),
            ),
            const SizedBox(height: AppSpacing.md),
            for (final d in _moreDestinations)
              ListTile(
                leading: Icon(d.icon, size: 20, color: AppColors.textSecondary),
                title: Text(d.label, style: const TextStyle(color: AppColors.text, fontSize: 15, fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  navigationShell.goBranch(d.branchIndex, initialLocation: d.branchIndex == navigationShell.currentIndex);
                },
              ),
            const Divider(color: AppColors.border, height: AppSpacing.lg),
            ListTile(
              leading: const Icon(LucideIcons.logOut, size: 20, color: AppColors.warning),
              title: const Text('Sign Out', style: TextStyle(color: AppColors.text, fontSize: 15, fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.of(sheetContext).pop();
                context.read<AuthStore>().signOut();
              },
            ),
          ],
        ),
      ),
    ),
  );
}

class _CompactShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const _CompactShell({required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    // Is the active branch one of the "More" destinations rather than one
    // of the 4 main tabs? If so, the More icon itself should read as active.
    final moreIsActive = _moreDestinations.any((d) => d.branchIndex == navigationShell.currentIndex);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(color: AppColors.bg, border: Border(top: BorderSide(color: AppColors.borderStrong, width: 1))),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 56,
            child: Row(
              children: [
                for (final d in _compactMainDestinations)
                  Expanded(
                    child: _CompactNavButton(
                      icon: d.icon,
                      label: d.label,
                      active: d.branchIndex == navigationShell.currentIndex,
                      onTap: () => navigationShell.goBranch(d.branchIndex, initialLocation: d.branchIndex == navigationShell.currentIndex),
                    ),
                  ),
                Expanded(
                  child: _CompactNavButton(
                    icon: LucideIcons.menu,
                    label: 'More',
                    active: moreIsActive,
                    onTap: () => _showMoreSheet(context, navigationShell),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CompactNavButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _CompactNavButton({required this.icon, required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.accent : AppColors.textMuted;
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 22, color: color),
          const SizedBox(height: 2),
          Text(label.toUpperCase(), style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

class _ExpandedShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const _ExpandedShell({required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Row(
        children: [
          Container(
            width: 220,
            decoration: const BoxDecoration(color: AppColors.bg, border: Border(right: BorderSide(color: AppColors.borderStrong, width: 1))),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: AppSpacing.xl),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                    child: Text('JM Finance', style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w800)),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (final d in _allDestinations)
                            _SidebarItem(
                              destination: d,
                              active: navigationShell.currentIndex == d.branchIndex,
                              onTap: () => navigationShell.goBranch(d.branchIndex, initialLocation: d.branchIndex == navigationShell.currentIndex),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const Divider(color: AppColors.border, height: 1),
                  const SizedBox(height: AppSpacing.sm),
                  _SidebarItem(
                    destination: const _NavDestination(LucideIcons.logOut, 'Sign Out', -1),
                    active: false,
                    onTap: () => context.read<AuthStore>().signOut(),
                    warning: true,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
              ),
            ),
          ),
          Expanded(child: navigationShell),
        ],
      ),
    );
  }
}

class _SidebarItem extends StatelessWidget {
  final _NavDestination destination;
  final bool active;
  final VoidCallback onTap;
  final bool warning;

  const _SidebarItem({required this.destination, required this.active, required this.onTap, this.warning = false});

  @override
  Widget build(BuildContext context) {
    final color = warning ? AppColors.warning : (active ? AppColors.accent : AppColors.textMuted);
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm2),
        decoration: BoxDecoration(
          color: active ? AppColors.surfaceMuted : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          children: [
            Icon(destination.icon, size: 20, color: color),
            const SizedBox(width: AppSpacing.md),
            Text(destination.label, style: TextStyle(color: warning ? AppColors.text : (active ? AppColors.text : AppColors.textMuted), fontSize: 14, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
