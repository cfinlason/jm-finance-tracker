import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Wraps the entire app once (in main.dart) so it always renders inside a
/// fixed max-width phone-sized shell, centered, regardless of browser
/// window size — per design spec §2's phone-size constraint.
class PhoneFrame extends StatelessWidget {
  final Widget child;
  const PhoneFrame({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.bg,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 430),
          child: child,
        ),
      ),
    );
  }
}
