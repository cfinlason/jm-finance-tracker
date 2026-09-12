import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';

/// Shared chrome for every entity add/edit popup: a titled, closable,
/// scrollable card sized appropriately for the current breakpoint.
/// Each entity dialog widget's build() should return this directly.
class AppDialog extends StatelessWidget {
  final String title;
  final Widget child;

  const AppDialog({super.key, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    final expanded = isExpanded(context);
    return Dialog(
      backgroundColor: AppColors.bg,
      insetPadding: expanded ? const EdgeInsets.symmetric(horizontal: 24, vertical: 40) : const EdgeInsets.all(AppSpacing.lg),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: expanded ? 480 : double.infinity,
          maxHeight: MediaQuery.sizeOf(context).height * 0.85,
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(title, style: const TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppColors.textMuted),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                child,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
