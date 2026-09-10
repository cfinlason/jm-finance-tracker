import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_button.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xxxl),
          const Text('WELCOME TO', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
          const SizedBox(height: AppSpacing.sm),
          const Text('JM Finance Tracker', style: TextStyle(color: AppColors.text, fontSize: 32, fontWeight: FontWeight.w800)),
          const SizedBox(height: AppSpacing.lg),
          const Text(
            'Track your accounts, transactions, bills, and goals — all in Jamaican dollars, all on your device.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 15, height: 1.5),
          ),
          const SizedBox(height: AppSpacing.xxxl),
          AppButton(label: 'Get Started', onPressed: () => context.push('/onboarding/accounts')),
        ],
      ),
    );
  }
}
