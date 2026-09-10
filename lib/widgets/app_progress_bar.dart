import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AppProgressBar extends StatelessWidget {
  final double progress;
  const AppProgressBar({super.key, required this.progress});

  @override
  Widget build(BuildContext context) {
    final clamped = progress.isFinite ? progress.clamp(0.0, 1.0) : 0.0;
    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          height: 6,
          decoration: BoxDecoration(color: AppColors.surfaceMuted, borderRadius: BorderRadius.circular(3)),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Container(
              width: constraints.maxWidth * clamped,
              height: 6,
              decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(3)),
            ),
          ),
        );
      },
    );
  }
}
