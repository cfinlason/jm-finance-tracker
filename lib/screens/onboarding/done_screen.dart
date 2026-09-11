import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_button.dart';
import '../../stores/settings_store.dart';

class OnboardingDoneScreen extends StatelessWidget {
  const OnboardingDoneScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xxxl),
          const Text("You're all set", style: TextStyle(color: AppColors.text, fontSize: 28, fontWeight: FontWeight.w800)),
          const SizedBox(height: AppSpacing.sm),
          const Text('Your finance tracker is ready to go.', style: TextStyle(color: AppColors.textSecondary, fontSize: 15)),
          const SizedBox(height: AppSpacing.xxxl),
          AppButton(
            label: 'Go to Home',
            onPressed: () {
              context.read<SettingsStore>().setHasCompletedOnboarding(true);
              context.go('/home');
            },
          ),
        ],
      ),
    );
  }
}
