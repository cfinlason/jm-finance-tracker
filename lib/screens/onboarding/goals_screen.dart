import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_form_field.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_card.dart';
import '../../widgets/list_row.dart';
import '../../stores/goals_store.dart';

class OnboardingGoalsScreen extends StatefulWidget {
  const OnboardingGoalsScreen({super.key});

  @override
  State<OnboardingGoalsScreen> createState() => _OnboardingGoalsScreenState();
}

class _OnboardingGoalsScreenState extends State<OnboardingGoalsScreen> {
  String _name = '';
  String _targetText = '';

  void _handleAdd(GoalsStore store) {
    final target = double.tryParse(_targetText);
    if (_name.isEmpty || target == null) return;
    store.addGoal(name: _name, icon: 'target', targetAmount: target);
    setState(() {
      _name = '';
      _targetText = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final goalsStore = context.watch<GoalsStore>();
    final goals = goalsStore.goals;

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          const Text('Choose your goals', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          const Text('Set savings goals to work toward. Optional — you can add these later too.', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: AppSpacing.xl),
          if (goals.isNotEmpty)
            AppCard(
              margin: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: Column(
                children: [
                  for (var i = 0; i < goals.length; i++)
                    ListRow(icon: const Icon(LucideIcons.target, size: 16, color: AppColors.textSecondary), title: goals[i].name, amount: goals[i].targetAmount, isLast: i == goals.length - 1),
                ],
              ),
            ),
          AppFormField(label: 'Goal name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Emergency Fund'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(
            label: 'Target amount (J\$)',
            value: _targetText,
            onChanged: (v) => setState(() => _targetText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Add Goal',
            variant: AppButtonVariant.secondary,
            onPressed: (_name.isNotEmpty && _targetText.isNotEmpty) ? () => _handleAdd(goalsStore) : null,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Continue', onPressed: () => context.push('/onboarding/done')),
        ],
      ),
    );
  }
}
