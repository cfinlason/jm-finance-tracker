import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../logic/bill_calendar.dart';

bool _isSameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

const _weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/// An iOS-Calendar-style month grid: weekday header, a 6-row grid of days
/// (leading/trailing days from adjacent months shown muted), today
/// highlighted with a ring, the selected day filled, and a small dot per
/// bill due that day. Purely presentational — occurrence data and
/// selection state live in the caller.
class MonthCalendar extends StatelessWidget {
  final DateTime month;
  final List<BillOccurrence> occurrences;
  final DateTime? selectedDate;
  final ValueChanged<DateTime> onSelectDate;
  final VoidCallback onPreviousMonth;
  final VoidCallback onNextMonth;
  final bool compact;

  const MonthCalendar({
    super.key,
    required this.month,
    required this.occurrences,
    required this.selectedDate,
    required this.onSelectDate,
    required this.onPreviousMonth,
    required this.onNextMonth,
    this.compact = false,
  });

  static const _monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final firstOfMonth = DateTime(month.year, month.month, 1);
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    // DateTime.weekday is 1=Mon..7=Sun; convert to 0=Sun..6=Sat for a
    // Sun-first grid to match iOS Calendar's default week layout.
    final leadingBlanks = firstOfMonth.weekday % 7;

    final occurrencesByDay = <int, List<BillOccurrence>>{};
    for (final occ in occurrences) {
      occurrencesByDay.putIfAbsent(occ.date.day, () => []).add(occ);
    }

    final cellSize = compact ? 36.0 : 44.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${_monthNames[month.month - 1]} ${month.year}',
              style: TextStyle(color: AppColors.text, fontSize: compact ? 15 : 18, fontWeight: FontWeight.w700),
            ),
            Row(
              children: [
                _NavArrow(icon: Icons.chevron_left, onTap: onPreviousMonth),
                const SizedBox(width: AppSpacing.xs),
                _NavArrow(icon: Icons.chevron_right, onTap: onNextMonth),
              ],
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            for (final label in _weekdayLabels)
              Expanded(
                child: Center(
                  child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                ),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 7, childAspectRatio: 1),
          itemCount: 42, // 6 full weeks, enough for any month's leading blanks
          itemBuilder: (context, index) {
            final dayNumber = index - leadingBlanks + 1;
            if (dayNumber < 1 || dayNumber > daysInMonth) return const SizedBox.shrink();

            final date = DateTime(month.year, month.month, dayNumber);
            final isToday = _isSameDay(date, today);
            final isSelected = selectedDate != null && _isSameDay(date, selectedDate!);
            final dayOccurrences = occurrencesByDay[dayNumber] ?? const [];

            // The GestureDetector fills the whole grid cell (via behavior:
            // opaque, since the circle Container beneath it doesn't paint
            // the corners) rather than just the small circle — a real
            // device's tap rarely lands pixel-perfectly on a 36-44px circle,
            // and this was previously a dead zone around it.
            return GestureDetector(
              onTap: () => onSelectDate(date),
              behavior: HitTestBehavior.opaque,
              child: Center(
                child: Container(
                  width: cellSize,
                  height: cellSize,
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.accent : Colors.transparent,
                    shape: BoxShape.circle,
                    border: isToday && !isSelected ? Border.all(color: AppColors.accent, width: 1.5) : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$dayNumber',
                        style: TextStyle(
                          color: isSelected ? AppColors.accentInk : AppColors.text,
                          fontSize: compact ? 13 : 14,
                          fontWeight: isToday || isSelected ? FontWeight.w700 : FontWeight.w500,
                        ),
                      ),
                      if (dayOccurrences.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(top: 2),
                          width: 4,
                          height: 4,
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.accentInk : AppColors.accent,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _NavArrow extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _NavArrow({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Icon(icon, size: 20, color: AppColors.textSecondary),
      ),
    );
  }
}
