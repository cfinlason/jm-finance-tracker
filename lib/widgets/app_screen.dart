import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Per-screen wrapper: safe-area handling, optional scrolling, optional
/// horizontal/bottom padding. Every screen body renders inside this.
class AppScreen extends StatelessWidget {
  final Widget child;
  final bool scroll;
  final bool padded;

  const AppScreen({super.key, required this.child, this.scroll = true, this.padded = true});

  @override
  Widget build(BuildContext context) {
    final content = padded
        ? Padding(padding: const EdgeInsets.fromLTRB(AppSpacing.xl, 0, AppSpacing.xl, AppSpacing.xxxl), child: child)
        : child;

    return Container(
      color: AppColors.bg,
      child: SafeArea(
        child: scroll ? SingleChildScrollView(child: content) : content,
      ),
    );
  }
}
