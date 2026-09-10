import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Emphasis variant: 2px accent top rule + surface fill, per design.md.txt §7
/// (hero, debt-projection cards). Normal variant: plain 1px border.
class AppCard extends StatelessWidget {
  final Widget child;
  final bool emphasis;
  final EdgeInsetsGeometry? margin;

  const AppCard({super.key, required this.child, this.emphasis = false, this.margin});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: emphasis ? AppColors.surface : Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: emphasis
            ? const Border(
                top: BorderSide(color: AppColors.accent, width: 2),
                left: BorderSide(color: AppColors.border, width: 1),
                right: BorderSide(color: AppColors.border, width: 1),
                bottom: BorderSide(color: AppColors.border, width: 1),
              )
            : Border.all(color: AppColors.border, width: 1),
      ),
      child: child,
    );
  }
}
