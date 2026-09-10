import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SegmentOption<T> {
  final String label;
  final T value;
  const SegmentOption({required this.label, required this.value});
}

class AppSegmentedControl<T> extends StatelessWidget {
  final List<SegmentOption<T>> options;
  final T value;
  final ValueChanged<T> onChanged;

  const AppSegmentedControl({super.key, required this.options, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(color: AppColors.surfaceMuted, borderRadius: BorderRadius.circular(AppRadius.pill)),
      child: Row(
        children: options.map((opt) {
          final active = opt.value == value;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(opt.value),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm2),
                decoration: BoxDecoration(color: active ? AppColors.accent : Colors.transparent, borderRadius: BorderRadius.circular(AppRadius.pill)),
                alignment: Alignment.center,
                child: Text(opt.label, style: TextStyle(color: active ? AppColors.accentInk : AppColors.textMuted, fontWeight: FontWeight.w700, fontSize: 13)),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
