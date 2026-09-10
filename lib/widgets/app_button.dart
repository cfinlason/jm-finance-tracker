import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum AppButtonVariant { primary, secondary }

/// Pass `onPressed: null` to render a disabled button.
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final AppButtonVariant variant;

  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.variant = AppButtonVariant.primary,
  });

  @override
  Widget build(BuildContext context) {
    final isPrimary = variant == AppButtonVariant.primary;
    final disabled = onPressed == null || loading;

    return Opacity(
      opacity: disabled ? 0.4 : 1,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: disabled ? null : onPressed,
          borderRadius: BorderRadius.circular(AppRadius.md),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md2),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isPrimary ? AppColors.accent : Colors.transparent,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: isPrimary ? null : Border.all(color: AppColors.border),
            ),
            child: loading
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: isPrimary ? AppColors.accentInk : AppColors.text),
                  )
                : Text(label, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: isPrimary ? AppColors.accentInk : AppColors.text)),
          ),
        ),
      ),
    );
  }
}
