import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'app_button.dart';

class EmptyState extends StatelessWidget {
  final Widget icon;
  final String message;
  final String? ctaLabel;
  final VoidCallback? onPressCta;

  const EmptyState({super.key, required this.icon, required this.message, this.ctaLabel, this.onPressCta});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xxxl),
      child: Column(
        children: [
          icon,
          const SizedBox(height: AppSpacing.md),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted, fontSize: 14)),
          if (ctaLabel != null && onPressCta != null) ...[
            const SizedBox(height: AppSpacing.sm),
            SizedBox(width: 160, child: AppButton(label: ctaLabel!, onPressed: onPressCta)),
          ],
        ],
      ),
    );
  }
}
