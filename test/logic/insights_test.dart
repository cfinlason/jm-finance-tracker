import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/logic/insights.dart';
import 'package:jm_finance_tracker/models/models.dart';

Transaction _tx({
  String id = 'tx',
  String categoryId = 'food',
  double amount = -100,
  String date = '2026-01-15T00:00:00.000Z',
  String type = 'expense',
}) =>
    Transaction(id: id, accountId: 'a1', categoryId: categoryId, amount: amount, note: '', date: date, type: type);

void main() {
  group('categoryTotals', () {
    test('sums current-period expenses by category and computes percent change', () {
      final transactions = [
        _tx(categoryId: 'food', amount: -100, date: '2026-01-15T00:00:00.000Z'),
        _tx(categoryId: 'food', amount: -50, date: '2025-12-15T00:00:00.000Z'),
      ];
      final result = categoryTotals(
        transactions,
        DateTime.parse('2026-01-01T00:00:00.000Z'),
        DateTime.parse('2026-02-01T00:00:00.000Z'),
        DateTime.parse('2025-12-01T00:00:00.000Z'),
        DateTime.parse('2026-01-01T00:00:00.000Z'),
      );
      expect(result[0].categoryId, 'food');
      expect(result[0].total, 100);
      expect(result[0].previousTotal, 50);
      expect(result[0].percentChange, 100);
    });
  });

  group('incomeVsSpendingTrend', () {
    test('buckets income and spending by week', () {
      final transactions = [
        _tx(type: 'income', amount: 500, date: '2026-01-14T00:00:00.000Z'),
        _tx(type: 'expense', amount: -200, date: '2026-01-14T00:00:00.000Z'),
      ];
      final buckets = incomeVsSpendingTrend(transactions, 'week', 2, DateTime.parse('2026-01-15T00:00:00.000Z'));
      expect(buckets.length, 2);
      expect(buckets[1].income, 500);
      expect(buckets[1].spending, 200);
    });
  });

  group('topTransactions', () {
    test('returns the top N transactions by absolute amount within the period', () {
      final transactions = [
        _tx(amount: -50, date: '2026-01-05T00:00:00.000Z'),
        _tx(amount: -900, date: '2026-01-10T00:00:00.000Z'),
        _tx(amount: 300, date: '2026-01-12T00:00:00.000Z'),
      ];
      final top = topTransactions(
        transactions,
        DateTime.parse('2026-01-01T00:00:00.000Z'),
        DateTime.parse('2026-02-01T00:00:00.000Z'),
        n: 2,
      );
      expect(top.map((t) => t.amount).toList(), [-900, 300]);
    });
  });
}
