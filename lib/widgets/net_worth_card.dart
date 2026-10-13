import 'package:flutter/material.dart';
import '../logic/net_worth.dart';
import '../theme/app_theme.dart';
import '../utils/money.dart';
import 'app_card.dart';
import 'app_progress_bar.dart';

class NetWorthCard extends StatelessWidget {
  final NetWorth netWorth;
  final double goalUsd;
  final double? rate;
  final DateTime? rateUpdatedAt;
  final bool rateFailed;

  const NetWorthCard({
    super.key,
    required this.netWorth,
    required this.goalUsd,
    this.rate,
    this.rateUpdatedAt,
    this.rateFailed = false,
  });

  static String _date(DateTime t) {
    final d = t.toLocal();
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${m[d.month - 1]} ${d.day}, ${d.year}';
  }

  @override
  Widget build(BuildContext context) {
    final usd = netWorth.usd;
    final hasRate = rate != null && usd != null;
    final pct = netWorth.progress.isFinite ? (netWorth.progress.clamp(0.0, 1.0) * 100).round() : 0;
    final goalText = formatUsd(goalUsd).replaceAll(RegExp(r'\.00$'), '');
    const warn = TextStyle(color: AppColors.warning, fontSize: 12);

    return AppCard(
      emphasis: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('NET WORTH', style: AppTypography.caption),
          const SizedBox(height: AppSpacing.sm),
          if (hasRate) ...[
            Text(formatUsd(usd), style: AppTypography.sectionStat),
            const SizedBox(height: AppSpacing.md),
            AppProgressBar(progress: netWorth.progress),
            const SizedBox(height: AppSpacing.sm),
            Text('$pct% of $goalText', style: AppTypography.body.copyWith(color: AppColors.textSecondary)),
            const SizedBox(height: AppSpacing.sm),
            Text(formatMoney(netWorth.jmd), style: AppTypography.body.copyWith(color: AppColors.textSecondary)),
            if (rateFailed) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(rateUpdatedAt == null ? 'Using saved rate' : 'Using saved rate from ${_date(rateUpdatedAt!)}', style: warn),
            ],
          ] else ...[
            Text(formatMoney(netWorth.jmd), style: AppTypography.sectionStat),
            const SizedBox(height: AppSpacing.sm),
            const Text('Exchange rate unavailable — retry in Settings', style: warn),
          ],
        ],
      ),
    );
  }
}
