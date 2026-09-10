import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AppToggle extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;

  const AppToggle({super.key, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 40,
        height: 24,
        decoration: BoxDecoration(color: value ? AppColors.accent : AppColors.surfaceMuted, borderRadius: BorderRadius.circular(AppRadius.pill)),
        child: AnimatedAlign(
          duration: const Duration(milliseconds: 150),
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 2),
            width: 20,
            height: 20,
            decoration: const BoxDecoration(color: AppColors.text, shape: BoxShape.circle),
          ),
        ),
      ),
    );
  }
}
