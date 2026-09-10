import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class IconChip extends StatelessWidget {
  final Widget child;
  final double size;

  const IconChip({super.key, required this.child, this.size = 34});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: AppColors.surfaceMuted, borderRadius: BorderRadius.circular(AppRadius.sm)),
      alignment: Alignment.center,
      child: child,
    );
  }
}
