DateTime addDays(DateTime date, int days) => date.add(Duration(days: days));

/// Adds [months] to [date], clamping the day-of-month if the target month
/// is shorter (e.g. Jan 31 + 1 month -> Feb 28/29). Uses floor-style month
/// arithmetic so negative [months] crosses year boundaries correctly.
DateTime addMonths(DateTime date, int months) {
  final totalMonths = date.month - 1 + months;
  final monthIndex = totalMonths % 12; // Dart's % is Euclidean: always 0..11
  final yearOffset = (totalMonths - monthIndex) ~/ 12;
  final year = date.year + yearOffset;
  final month = monthIndex + 1;
  final daysInMonth = DateTime(year, month + 1, 0).day;
  final day = date.day > daysInMonth ? daysInMonth : date.day;
  return DateTime(year, month, day, date.hour, date.minute, date.second, date.millisecond);
}

bool isBefore(DateTime a, DateTime b) => a.isBefore(b);

/// The next date on/after [from] (ignoring time-of-day) whose day-of-month
/// matches [dayOfMonth], clamped to the last day of a shorter month (e.g.
/// dayOfMonth 31 in February becomes the 28th/29th). If [from]'s own day has
/// already passed [dayOfMonth] this month, rolls forward to next month.
DateTime nextDateForDayOfMonth(DateTime from, int dayOfMonth) {
  DateTime candidateFor(DateTime monthAnchor) {
    final daysInMonth = DateTime(monthAnchor.year, monthAnchor.month + 1, 0).day;
    final day = dayOfMonth > daysInMonth ? daysInMonth : dayOfMonth;
    return DateTime(monthAnchor.year, monthAnchor.month, day);
  }

  final today = DateTime(from.year, from.month, from.day);
  final thisMonth = candidateFor(from);
  if (!thisMonth.isBefore(today)) return thisMonth;
  return candidateFor(DateTime(from.year, from.month + 1, 1));
}

DateTime nextOccurrence(DateTime from, String frequency) {
  switch (frequency) {
    case 'weekly':
      return addDays(from, 7);
    case 'biweekly':
      return addDays(from, 14);
    case 'monthly':
      return addMonths(from, 1);
    default:
      throw ArgumentError('Unknown frequency: $frequency');
  }
}
