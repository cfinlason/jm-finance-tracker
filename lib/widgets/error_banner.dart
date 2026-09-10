import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../stores/error_banner_store.dart';
import '../theme/app_theme.dart';

/// Overlays a dismissible, auto-hiding banner when ErrorBannerStore has a
/// message. Must be placed inside a Stack (main.dart, Task 13) since it
/// positions itself absolutely.
class ErrorBanner extends StatefulWidget {
  const ErrorBanner({super.key});

  @override
  State<ErrorBanner> createState() => _ErrorBannerState();
}

class _ErrorBannerState extends State<ErrorBanner> {
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<ErrorBannerStore>();
    final message = store.message;

    if (message != null) {
      _timer?.cancel();
      _timer = Timer(const Duration(seconds: 4), () {
        if (mounted) context.read<ErrorBannerStore>().hide();
      });
    }

    if (message == null) return const SizedBox.shrink();

    return Positioned(
      left: AppSpacing.xl,
      right: AppSpacing.xl,
      bottom: 24,
      child: GestureDetector(
        onTap: () => context.read<ErrorBannerStore>().hide(),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(color: AppColors.surface, border: Border.all(color: AppColors.warning), borderRadius: BorderRadius.circular(AppRadius.md)),
          child: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.text, fontSize: 13)),
        ),
      ),
    );
  }
}
