import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_form_field.dart';
import '../../widgets/app_button.dart';
import '../../stores/auth_store.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String _email = '';
  String _password = '';
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final authStore = context.watch<AuthStore>();
    final isValid = _email.contains('@') && _password.isNotEmpty;

    Future<void> handleSignIn() async {
      setState(() => _loading = true);
      final ok = await authStore.signIn(email: _email.trim(), password: _password);
      if (mounted) setState(() => _loading = false);
      if (ok && context.mounted) context.go('/');
    }

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xxxl),
          const Text('WELCOME BACK', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
          const SizedBox(height: AppSpacing.sm),
          const Text('Sign In', style: TextStyle(color: AppColors.text, fontSize: 32, fontWeight: FontWeight.w800)),
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
            error: authStore.error,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Sign In', loading: _loading, onPressed: isValid ? handleSignIn : null),
          const SizedBox(height: AppSpacing.lg),
          GestureDetector(
            onTap: () {
              authStore.clearError();
              context.go('/auth/signup');
            },
            child: const Text(
              "Don't have an account? Sign up",
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
