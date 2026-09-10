import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';

class MainShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const MainShell({super.key, required this.navigationShell});

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
            items: const [
              BottomNavigationBarItem(icon: Icon(LucideIcons.home), label: 'HOME'),
              BottomNavigationBarItem(icon: Icon(LucideIcons.list), label: 'TRANSACTIONS'),
              BottomNavigationBarItem(icon: Icon(LucideIcons.pieChart), label: 'INSIGHTS'),
              BottomNavigationBarItem(icon: Icon(LucideIcons.target), label: 'GOALS'),
              BottomNavigationBarItem(icon: Icon(LucideIcons.menu), label: 'MORE'),
            ],
          ),
        ),
      ),
    );
  }
}
