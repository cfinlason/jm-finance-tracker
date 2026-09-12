import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';

/// Centers and caps content width on Expanded (wide) screens; passes
/// through unchanged on Compact (mobile) screens.
class ContentBounds extends StatelessWidget {
  final Widget child;
  const ContentBounds({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    if (!isExpanded(context)) return child;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1200),
        child: Padding(padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxxl), child: child),
      ),
    );
  }
}
