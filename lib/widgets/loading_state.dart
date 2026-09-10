import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class LoadingState extends StatelessWidget {
  const LoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.bg,
      alignment: Alignment.center,
      child: const CircularProgressIndicator(color: AppColors.accent),
    );
  }
}
