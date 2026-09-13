import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';

/// A small "back to Home" affordance for screens that sit outside the main
/// tab shell (pushed routes like Debt and Cash Flow), which otherwise have
/// no nav chrome to get back to Home besides the system back gesture.
class HomeButton extends StatelessWidget {
  const HomeButton({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: () => context.go('/home'),
      icon: const Icon(LucideIcons.house, size: 20, color: AppColors.textSecondary),
      tooltip: 'Home',
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
    );
  }
}
