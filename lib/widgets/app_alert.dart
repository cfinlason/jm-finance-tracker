import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum AppAlertVariant { normal, warning }

class AppAlert extends StatelessWidget {
  final AppAlertVariant variant;
  final String text;

  const AppAlert({super.key, this.variant = AppAlertVariant.normal, required this.text});

  @override
  Widget build(BuildContext context) {
    final isWarning = variant == AppAlertVariant.warning;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: isWarning ? AppColors.warningBorder : AppColors.border),
      ),
      child: Row(
        children: [
          Icon(isWarning ? Icons.warning_amber_rounded : Icons.check_circle_outline, size: 16, color: isWarning ? AppColors.warning : AppColors.accent),
          const SizedBox(width: AppSpacing.sm2),
          Expanded(child: Text(text, style: const TextStyle(color: AppColors.text, fontSize: 13))),
        ],
      ),
    );
  }
}
