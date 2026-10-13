import 'dart:math' as math;
import 'package:flutter/material.dart' hide StepState;
import '../logic/baby_steps.dart';
import '../theme/app_theme.dart';

const _stepColors = [
  AppColors.stepBlue,
  AppColors.stepPurple,
  AppColors.stepYellow,
  AppColors.stepGreen,
  AppColors.stepRed,
];

/// Color for a Baby Step number (1-based), cycling through the five palette colors.
Color stepColor(int step) => _stepColors[(step - 1) % _stepColors.length];

class StepRing extends StatelessWidget {
  final List<StepStatus> steps;
  final String centerTitle;
  final String centerSubtitle;
  final double size;

  const StepRing({
    super.key,
    required this.steps,
    required this.centerTitle,
    required this.centerSubtitle,
    this.size = 240,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$centerTitle, $centerSubtitle',
      child: SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: _StepRingPainter(steps),
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(size * 0.18),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: size * 0.64),
                      child: Text(
                        centerTitle,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.sectionStat,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      centerSubtitle,
                      textAlign: TextAlign.center,
                      style: AppTypography.caption,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StepRingPainter extends CustomPainter {
  final List<StepStatus> steps;
  _StepRingPainter(this.steps);

  @override
  void paint(Canvas canvas, Size size) {
    if (steps.isEmpty) return;
    final stroke = size.shortestSide * 0.075;
    final rect = Rect.fromCircle(
      center: size.center(Offset.zero),
      radius: (size.shortestSide - stroke) / 2,
    );
    final n = steps.length;
    final seg = 2 * math.pi / n;
    // Gap includes the round caps, which extend stroke/2 past each arc end.
    final capAngle = (stroke / 2) / (rect.width / 2);
    final gap = capAngle * 2 + 0.07;
    final len = seg - gap;
    if (!(len > 0)) return;

    Paint paintFor(Color c) => Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = stroke
      ..color = c;

    for (var i = 0; i < n; i++) {
      final s = steps[i];
      final start = -math.pi / 2 + seg * i + gap / 2;
      final color = stepColor(s.step);
      if (s.state == StepState.done) {
        canvas.drawArc(rect, start, len, false, paintFor(color));
        continue;
      }
      canvas.drawArc(rect, start, len, false, paintFor(AppColors.surfaceMuted));
      if (s.state == StepState.current) {
        final p = s.progress.isFinite ? s.progress.clamp(0.0, 1.0) : 0.0;
        if (p > 0) {
          canvas.drawArc(rect, start, len * p, false, paintFor(color));
        }
      }
    }
  }

  @override
  bool shouldRepaint(_StepRingPainter old) {
    if (old.steps.length != steps.length) return true;
    for (var i = 0; i < steps.length; i++) {
      final a = old.steps[i], b = steps[i];
      if (a.step != b.step || a.state != b.state || a.progress != b.progress) {
        return true;
      }
    }
    return false;
  }
}
