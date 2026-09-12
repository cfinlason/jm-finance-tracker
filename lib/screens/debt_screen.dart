import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../widgets/app_segmented_control.dart';
import '../widgets/app_form_field.dart';
import '../utils/money.dart';
import '../logic/debt_payoff.dart';
import '../models/models.dart';
import '../stores/debts_store.dart';
import 'debt_edit_dialog.dart';

class DebtScreen extends StatefulWidget {
  const DebtScreen({super.key});

  @override
  State<DebtScreen> createState() => _DebtScreenState();
}

class _DebtScreenState extends State<DebtScreen> {
  String _strategy = 'snowball';
  String _extraText = '0';

  // Memoize the payoff projection: projectDebtPayoff() runs a full
  // month-by-month simulation for both strategies, which is wasteful to
  // redo on every keystroke in the extra-payment field. Many keystrokes
  // (e.g. typing a leading zero, a trailing decimal point, or reformatting
  // to the same numeric value) don't actually change the parsed `extra`
  // amount or the debt list, so we only recompute when those real inputs
  // change rather than on every raw text change.
  List<Debt>? _lastDebts;
  double? _lastExtra;
  DebtPayoffProjection? _cachedProjection;

  DebtPayoffProjection _projectionFor(List<Debt> debts, double extra) {
    if (_cachedProjection != null &&
        _lastExtra == extra &&
        _lastDebts != null &&
        _lastDebts!.length == debts.length &&
        _debtsEqual(_lastDebts!, debts)) {
      return _cachedProjection!;
    }
    final projection = projectDebtPayoff(debts, extra);
    _lastDebts = debts;
    _lastExtra = extra;
    _cachedProjection = projection;
    return projection;
  }

  bool _debtsEqual(List<Debt> a, List<Debt> b) {
    for (var i = 0; i < a.length; i++) {
      if (a[i].id != b[i].id || a[i].balance != b[i].balance || a[i].interestRate != b[i].interestRate || a[i].minPayment != b[i].minPayment) {
        return false;
      }
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final debts = context.watch<DebtsStore>().debts;
    final totalOwed = debts.fold<double>(0, (s, d) => s + d.balance);
    final extra = double.tryParse(_extraText) ?? 0;
    final projection = _projectionFor(debts, extra);
    final result = _strategy == 'snowball' ? projection.snowball : projection.avalanche;

    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Debt', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
                IconButton(icon: const Icon(LucideIcons.plus, color: AppColors.accent), onPressed: () => showDialog(context: context, builder: (_) => const DebtEditDialog(id: 'new'))),
              ],
            ),
            if (debts.isEmpty)
              EmptyState(
                icon: const IconChip(child: Icon(LucideIcons.creditCard, size: 16, color: AppColors.textMuted)),
                message: 'No debts tracked.',
                ctaLabel: 'Add Debt',
                onPressCta: () => showDialog(context: context, builder: (_) => const DebtEditDialog(id: 'new')),
              )
            else ...[
              AppCard(
                margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('TOTAL OWED', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      formatMoney(totalOwed),
                      style: const TextStyle(color: AppColors.text, fontSize: 32, fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()]),
                    ),
                  ],
                ),
              ),
              AppCard(
                emphasis: true,
                margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Payoff Projection', style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700)),
                    const SizedBox(height: AppSpacing.md),
                    AppSegmentedControl<String>(
                      options: const [SegmentOption(label: 'Snowball', value: 'snowball'), SegmentOption(label: 'Avalanche', value: 'avalanche')],
                      value: _strategy,
                      onChanged: (v) => setState(() => _strategy = v),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    AppFormField(
                      label: 'Extra monthly payment (J\$)',
                      value: _extraText,
                      onChanged: (v) => setState(() => _extraText = v),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('MONTHS TO DEBT-FREE', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            Text('${result.months}', style: const TextStyle(color: AppColors.accent, fontSize: 22, fontWeight: FontWeight.w800)),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('TOTAL INTEREST', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            Text(
                              formatMoney(result.totalInterest),
                              style: const TextStyle(color: AppColors.accent, fontSize: 22, fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()]),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              GridView.count(
                crossAxisCount: isExpanded(context) ? 2 : 1,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: AppSpacing.sm,
                crossAxisSpacing: AppSpacing.md,
                childAspectRatio: isExpanded(context) ? 3.4 : 4.2,
                children: [
                  for (final d in debts)
                    GestureDetector(
                      onTap: () => showDialog(context: context, builder: (_) => DebtEditDialog(id: d.id)),
                      child: AppCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(d.name, style: const TextStyle(color: AppColors.text, fontSize: 15, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            Text(
                              '${formatMoney(d.balance)} · ${d.interestRate}% APR · Min ${formatMoney(d.minPayment)}',
                              style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontFeatures: [FontFeature.tabularFigures()]),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
