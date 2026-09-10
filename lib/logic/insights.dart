import '../models/models.dart';

class CategoryTotal {
  final String categoryId;
  final double total;
  final double previousTotal;
  final double? percentChange;
  CategoryTotal({required this.categoryId, required this.total, required this.previousTotal, this.percentChange});
}

class TrendBucket {
  final String label;
  final double income;
  final double spending;
  TrendBucket({required this.label, required this.income, required this.spending});
}

bool _inRange(Transaction t, DateTime start, DateTime end) {
  final date = DateTime.parse(t.date);
  return !date.isBefore(start) && date.isBefore(end);
}

Map<String, double> _sumByCategory(List<Transaction> list) {
  final map = <String, double>{};
  for (final t in list) {
    map[t.categoryId] = (map[t.categoryId] ?? 0) + t.amount.abs();
  }
  return map;
}

List<CategoryTotal> categoryTotals(
  List<Transaction> transactions,
  DateTime periodStart,
  DateTime periodEnd,
  DateTime previousPeriodStart,
  DateTime previousPeriodEnd,
) {
  final current = transactions.where((t) => _inRange(t, periodStart, periodEnd) && t.type == 'expense').toList();
  final previous =
      transactions.where((t) => _inRange(t, previousPeriodStart, previousPeriodEnd) && t.type == 'expense').toList();

  final currentMap = _sumByCategory(current);
  final previousMap = _sumByCategory(previous);
  final categoryIds = {...currentMap.keys, ...previousMap.keys};

  final results = categoryIds.map((categoryId) {
    final total = currentMap[categoryId] ?? 0;
    final previousTotal = previousMap[categoryId] ?? 0;
    final percentChange = previousTotal == 0 ? null : ((total - previousTotal) / previousTotal * 1000).round() / 10;
    return CategoryTotal(categoryId: categoryId, total: total, previousTotal: previousTotal, percentChange: percentChange);
  }).toList();

  results.sort((a, b) => b.total.compareTo(a.total));
  return results;
}

List<TrendBucket> incomeVsSpendingTrend(
  List<Transaction> transactions,
  String bucketBy, // 'week' | 'month'
  int numBuckets,
  DateTime end,
) {
  final bucketDuration = bucketBy == 'week' ? const Duration(days: 7) : const Duration(days: 30);
  final buckets = <TrendBucket>[];

  for (var i = numBuckets - 1; i >= 0; i--) {
    final bucketEnd = end.subtract(bucketDuration * i);
    final bucketStart = bucketEnd.subtract(bucketDuration);
    final inBucket = transactions.where((t) {
      final date = DateTime.parse(t.date);
      return !date.isBefore(bucketStart) && date.isBefore(bucketEnd);
    });
    final income = inBucket.where((t) => t.type == 'income').fold<double>(0, (s, t) => s + t.amount);
    final spending = inBucket.where((t) => t.type == 'expense').fold<double>(0, (s, t) => s + t.amount.abs());
    buckets.add(TrendBucket(
      label:
          '${bucketStart.year.toString().padLeft(4, '0')}-${bucketStart.month.toString().padLeft(2, '0')}-${bucketStart.day.toString().padLeft(2, '0')}',
      income: income,
      spending: spending,
    ));
  }
  return buckets;
}

List<Transaction> topTransactions(List<Transaction> transactions, DateTime periodStart, DateTime periodEnd, {int n = 5}) {
  final inPeriod = transactions.where((t) => _inRange(t, periodStart, periodEnd)).toList();
  inPeriod.sort((a, b) => b.amount.abs().compareTo(a.amount.abs()));
  return inPeriod.take(n).toList();
}
