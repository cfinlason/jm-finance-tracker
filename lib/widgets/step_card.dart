import 'package:flutter/material.dart' hide StepState;
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../logic/baby_steps.dart';
import '../theme/app_theme.dart';
import 'app_card.dart';
import 'app_form_field.dart';
import 'app_progress_bar.dart';
import 'app_toggle.dart';
import 'step_ring.dart';

class StepCard extends StatefulWidget {
  final StepStatus status;
  final VoidCallback? onToggleDone;
  final ValueChanged<double?>? onAmountChanged;
  final double? amount;

  const StepCard({
    super.key,
    required this.status,
    this.onToggleDone,
    this.onAmountChanged,
    this.amount,
  });

  @override
  State<StepCard> createState() => _StepCardState();
}

class _StepCardState extends State<StepCard> {
  late String _text = _format(widget.amount);

  static String _format(double? v) {
    if (v == null) return '';
    return v == v.roundToDouble() ? v.toInt().toString() : v.toString();
  }

  @override
  void didUpdateWidget(StepCard old) {
    super.didUpdateWidget(old);
    // Keep what the user is typing (e.g. "1.") unless the amount changed externally.
    if (widget.amount != old.amount && widget.amount != double.tryParse(_text)) {
      _text = _format(widget.amount);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.status;
    final locked = s.state == StepState.locked;
    final done = s.state == StepState.done;
    final current = s.state == StepState.current;
    final color = stepColor(s.step);
    final expanded = s.isManual && (current || done);

    return Opacity(
      opacity: locked ? 0.5 : 1,
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: locked ? AppColors.surfaceMuted : color.withValues(alpha: 0.18),
                    shape: BoxShape.circle,
                  ),
                  child: done
                      ? const Icon(LucideIcons.check, size: 18, color: AppColors.stepGreen)
                      : Text('${s.step}', style: AppTypography.bodyStrong.copyWith(color: locked ? AppColors.textMuted : color)),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(
                    s.title,
                    style: AppTypography.bodyStrong.copyWith(color: locked ? AppColors.textMuted : AppColors.text),
                  ),
                ),
                if (s.isManual && !locked)
                  AppToggle(value: done, onChanged: (_) => widget.onToggleDone?.call()),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(s.detail, style: AppTypography.body.copyWith(color: AppColors.textSecondary)),
            if (current && !s.isManual) ...[
              const SizedBox(height: AppSpacing.md),
              AppProgressBar(progress: s.progress),
            ],
            if (expanded) ...[
              const SizedBox(height: AppSpacing.md),
              AppFormField(
                label: 'AMOUNT (OPTIONAL)',
                value: _text,
                placeholder: '0',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (v) {
                  _text = v;
                  final t = v.trim();
                  widget.onAmountChanged?.call(t.isEmpty ? null : double.tryParse(t));
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}
