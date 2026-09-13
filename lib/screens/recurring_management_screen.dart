import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_card.dart';
import '../widgets/month_calendar.dart';
import '../utils/money.dart';
import '../logic/bill_calendar.dart';
import '../stores/recurring_store.dart';
import 'recurring_edit_dialog.dart';

bool _isSameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

const _monthNames = [
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

class RecurringManagementScreen extends StatefulWidget {
  const RecurringManagementScreen({super.key});

  @override
  State<RecurringManagementScreen> createState() => _RecurringManagementScreenState();
}

class _RecurringManagementScreenState extends State<RecurringManagementScreen> {
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime? _selectedDay;

  void _changeMonth(int delta) {
    setState(() {
      _month = DateTime(_month.year, _month.month + delta, 1);
      _selectedDay = null;
    });
  }

  List<BillOccurrence> _forDay(List<BillOccurrence> occurrences, DateTime day) {
    return occurrences.where((o) => _isSameDay(o.date, day)).toList();
  }

  void _showDetailsSheet(List<BillOccurrence> dayOccurrences, DateTime day) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: _DayDetailPanel(day: day, occurrences: dayOccurrences, embedded: true),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final rules = context.watch<RecurringStore>().rules;
    final occurrences = occurrencesInMonth(rules, _month);
    final expanded = isExpanded(context);

    final calendar = AppCard(
      child: MonthCalendar(
        month: _month,
        occurrences: occurrences,
        selectedDate: _selectedDay,
        onSelectDate: (date) {
          final dayOccurrences = _forDay(occurrences, date);
          setState(() => _selectedDay = date);
          if (!expanded) _showDetailsSheet(dayOccurrences, date);
        },
        onPreviousMonth: () => _changeMonth(-1),
        onNextMonth: () => _changeMonth(1),
      ),
    );

    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recurring Bills', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
                IconButton(
                  icon: const Icon(LucideIcons.plus, color: AppColors.accent),
                  onPressed: () => showDialog(context: context, builder: (_) => const RecurringEditDialog(id: 'new')),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            if (expanded)
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 3, child: calendar),
                    const SizedBox(width: AppSpacing.xl),
                    SizedBox(
                      width: 300,
                      child: _DayDetailPanel(day: _selectedDay, occurrences: _selectedDay == null ? const [] : _forDay(occurrences, _selectedDay!)),
                    ),
                  ],
                ),
              )
            else
              calendar,
          ],
        ),
      ),
    );
  }
}

class _DayDetailPanel extends StatelessWidget {
  final DateTime? day;
  final List<BillOccurrence> occurrences;
  final bool embedded;

  const _DayDetailPanel({required this.day, required this.occurrences, this.embedded = false});

  @override
  Widget build(BuildContext context) {
    if (day == null) {
      return const Padding(
        padding: EdgeInsets.only(top: AppSpacing.xxl),
        child: Text('Tap a day to see its bills.', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('${_monthNames[day!.month - 1]} ${day!.day}, ${day!.year}', style: const TextStyle(color: AppColors.text, fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: AppSpacing.md),
        if (occurrences.isEmpty)
          const Text('No bills due this day.', style: TextStyle(color: AppColors.textMuted, fontSize: 13))
        else
          for (final occ in occurrences)
            AppCard(
              margin: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: InkWell(
                onTap: () {
                  if (embedded) Navigator.of(context).pop();
                  showDialog(context: context, builder: (_) => RecurringEditDialog(id: occ.rule.id));
                },
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(occ.rule.name, style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w700)),
                          Text(occ.rule.frequency, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                        ],
                      ),
                    ),
                    Text(
                      formatMoney(occ.rule.amount),
                      style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()]),
                    ),
                  ],
                ),
              ),
            ),
      ],
    );
  }
}
