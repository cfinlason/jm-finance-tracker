import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';

class _NavDestination {
  final IconData icon;
  final String label;
  const _NavDestination(this.icon, this.label);
}

const _destinations = [
  _NavDestination(LucideIcons.home, 'Home'),
  _NavDestination(LucideIcons.list, 'Transactions'),
  _NavDestination(LucideIcons.pieChart, 'Insights'),
  _NavDestination(LucideIcons.target, 'Goals'),
  _NavDestination(LucideIcons.menu, 'More'),
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

class _CompactShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const _CompactShell({required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(color: AppColors.bg, border: Border(top: BorderSide(color: AppColors.borderStrong, width: 1))),
        child: SafeArea(
          top: false,
          child: BottomNavigationBar(
            currentIndex: navigationShell.currentIndex,
            onTap: (index) => navigationShell.goBranch(index, initialLocation: index == navigationShell.currentIndex),
            type: BottomNavigationBarType.fixed,
            backgroundColor: AppColors.bg,
            selectedItemColor: AppColors.accent,
            unselectedItemColor: AppColors.textMuted,
            selectedLabelStyle: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600),
            unselectedLabelStyle: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600),
            items: [
              for (final d in _destinations) BottomNavigationBarItem(icon: Icon(d.icon), label: d.label.toUpperCase()),
            ],
          ),
        ),
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
                  for (var i = 0; i < _destinations.length; i++)
                    _SidebarItem(
                      destination: _destinations[i],
                      active: navigationShell.currentIndex == i,
                      onTap: () => navigationShell.goBranch(i, initialLocation: i == navigationShell.currentIndex),
                    ),
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

  const _SidebarItem({required this.destination, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
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
            Icon(destination.icon, size: 20, color: active ? AppColors.accent : AppColors.textMuted),
            const SizedBox(width: AppSpacing.md),
            Text(destination.label, style: TextStyle(color: active ? AppColors.text : AppColors.textMuted, fontSize: 14, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
