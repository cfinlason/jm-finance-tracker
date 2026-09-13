import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_form_field.dart';
import '../../widgets/app_button.dart';
import '../../stores/auth_store.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  String _email = '';
  String _password = '';
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final authStore = context.watch<AuthStore>();
    final passwordError = _password.isNotEmpty && _password.length < 6 ? 'At least 6 characters' : authStore.error;
    final isValid = _email.contains('@') && _password.length >= 6;

    Future<void> handleSignUp() async {
      setState(() => _loading = true);
      final ok = await authStore.signUp(email: _email.trim(), password: _password);
      if (mounted) setState(() => _loading = false);
      if (ok && context.mounted) context.go('/');
    }

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
            'Create an account to sync your accounts, transactions, bills, and goals to the cloud.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 15, height: 1.5),
          ),
          const SizedBox(height: AppSpacing.xl),
          AppFormField(
            label: 'Email',
            value: _email,
            onChanged: (v) => setState(() => _email = v),
            keyboardType: TextInputType.emailAddress,
            placeholder: 'you@example.com',
          ),
          const SizedBox(height: AppSpacing.md),
          AppFormField(
            label: 'Password',
            value: _password,
            onChanged: (v) => setState(() => _password = v),
            obscureText: true,
            placeholder: 'At least 6 characters',
            error: passwordError,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Sign Up', loading: _loading, onPressed: isValid ? handleSignUp : null),
          const SizedBox(height: AppSpacing.lg),
          GestureDetector(
            onTap: () {
              authStore.clearError();
              context.go('/auth/login');
            },
            child: const Text(
              'Already have an account? Sign in',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
