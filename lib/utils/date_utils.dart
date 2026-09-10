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
