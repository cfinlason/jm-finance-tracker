import '../models/models.dart';
import '../utils/date_utils.dart' as date_utils;

/// One projected occurrence of a recurring bill landing on a specific date,
/// for calendar display. A rule only stores its single next due date plus a
/// frequency — this expands that into every date the bill falls on within a
/// given month by walking backward and forward from that anchor date.
class BillOccurrence {
  final RecurringRule rule;
  final DateTime date;
  BillOccurrence({required this.rule, required this.date});
}

DateTime _stepBack(DateTime date, String frequency) {
  switch (frequency) {
    case 'weekly':
      return date_utils.addDays(date, -7);
    case 'biweekly':
      return date_utils.addDays(date, -14);
    case 'monthly':
      return date_utils.addMonths(date, -1);
    default:
      return date;
  }
}

/// Every occurrence of every rule in [rules] that falls within the calendar
/// month containing [monthAnchor] (only year/month are used from it), sorted
/// by date. [monthAnchor] need not be the 1st of the month.
List<BillOccurrence> occurrencesInMonth(List<RecurringRule> rules, DateTime monthAnchor) {
  final monthStart = DateTime(monthAnchor.year, monthAnchor.month, 1);
  final monthEndExclusive = DateTime(monthAnchor.year, monthAnchor.month + 1, 1);
  final result = <BillOccurrence>[];

  for (final rule in rules) {
    var date = DateTime.parse(rule.nextDueDate);

    // Rewind to on/before monthStart. Capped so a malformed/zero-step
    // frequency can't spin forever.
    var guard = 0;
    while (date.isAfter(monthStart) && guard < 1000) {
      final prev = _stepBack(date, rule.frequency);
      if (!prev.isBefore(date)) break; // non-advancing frequency — bail out
      date = prev;
      guard++;
    }

    // Walk forward from there, collecting every occurrence inside the month.
    guard = 0;
    while (date.isBefore(monthEndExclusive) && guard < 1000) {
      if (!date.isBefore(monthStart)) {
        result.add(BillOccurrence(rule: rule, date: date));
      }
      final next = date_utils.nextOccurrence(date, rule.frequency);
      if (!next.isAfter(date)) break;
      date = next;
      guard++;
    }
  }

  result.sort((a, b) => a.date.compareTo(b.date));
  return result;
}
