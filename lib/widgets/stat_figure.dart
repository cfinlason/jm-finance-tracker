import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../utils/money.dart';

enum StatTone { neutral, positive }

class StatFigure extends StatelessWidget {
  final String label;
  final double amount;
  final StatTone tone;

  const StatFigure({super.key, required this.label, required this.amount, this.tone = StatTone.neutral});

  @override
  Widget build(BuildContext context) {
    final positive = tone == StatTone.positive;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
        const SizedBox(height: AppSpacing.xs),
        Text(
          '${positive && amount > 0 ? '+' : ''}${formatMoney(amount)}',
          style: TextStyle(
            color: positive ? AppColors.accent : AppColors.text,
            fontSize: 22,
            fontWeight: FontWeight.w800,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}
