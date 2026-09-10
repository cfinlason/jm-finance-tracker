import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../utils/money.dart';
import 'icon_chip.dart';

class ListRow extends StatelessWidget {
  final Widget icon;
  final String title;
  final String? caption;
  final double? amount;
  final bool showChevron;
  final VoidCallback? onTap;
  final bool isLast;

  const ListRow({
    super.key,
    required this.icon,
    required this.title,
    this.caption,
    this.amount,
    this.showChevron = false,
    this.onTap,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    final row = Container(
      decoration: BoxDecoration(
        border: isLast ? null : const Border(bottom: BorderSide(color: AppColors.borderHairline, width: 1)),
      ),
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md2),
      child: Row(
        children: [
          IconChip(child: icon),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w600)),
                if (caption != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(caption!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  ),
              ],
            ),
          ),
          if (amount != null)
            Text(
              '${amount! > 0 ? '+' : ''}${formatMoney(amount!)}',
              style: TextStyle(
                color: amount! > 0 ? AppColors.accent : AppColors.text,
                fontSize: 16,
                fontWeight: FontWeight.w800,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          if (showChevron)
            const Padding(padding: EdgeInsets.only(left: AppSpacing.sm), child: Icon(Icons.chevron_right, size: 18, color: AppColors.textMuted)),
        ],
      ),
    );

    return onTap != null ? InkWell(onTap: onTap, child: row) : row;
  }
}
