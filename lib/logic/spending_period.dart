import '../models/models.dart';

enum SpendingPeriod { week, month, year }

DateTime periodStart(SpendingPeriod period, DateTime now) {
  final today = DateTime(now.year, now.month, now.day);
  switch (period) {
    case SpendingPeriod.week:
      return DateTime(today.year, today.month, today.day - (today.weekday - DateTime.monday));
    case SpendingPeriod.month:
      return DateTime(now.year, now.month, 1);
    case SpendingPeriod.year:
      return DateTime(now.year, 1, 1);
  }
}

/// Sum of absolute expense amounts from the start of [period] through [now].
double spendingInPeriod(List<Transaction> transactions, SpendingPeriod period, DateTime now) {
  final start = periodStart(period, now);
  var total = 0.0;
  for (final t in transactions) {
    if (t.type != 'expense') continue;
    final d = DateTime.tryParse(t.date);
    if (d == null || d.isBefore(start) || d.isAfter(now)) continue;
    total += t.amount.abs();
  }
  return total;
}
