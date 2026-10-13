import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/logic/spending_period.dart';
import 'package:jm_finance_tracker/models/models.dart';

Transaction tx(String date, double amount, {String type = 'expense'}) =>
    Transaction(id: '$date$type$amount', accountId: 'a', categoryId: 'c', amount: amount, note: '', date: date, type: type);

void main() {
  final now = DateTime(2026, 10, 14); // Wednesday
  final txs = [
    tx('2026-10-11T12:00:00', -1), // Sunday before this week
    tx('2026-10-12T00:00:00', -10), // Monday, start of week
    tx('2026-10-13T09:00:00', -20),
    tx('2026-10-01T00:00:00', -100), // start of month
    tx('2026-09-30T23:00:00', -1000), // previous month
    tx('2026-01-01T00:00:00', -10000), // start of year
    tx('2025-12-31T23:00:00', -100000), // previous year
    tx('2026-10-13T10:00:00', 5000, type: 'income'),
  ];
  test('week starts Monday 2026-10-12', () => expect(spendingInPeriod(txs, SpendingPeriod.week, now), 30));
  test('month starts 2026-10-01', () => expect(spendingInPeriod(txs, SpendingPeriod.month, now), 131));
  test('year starts 2026-01-01', () => expect(spendingInPeriod(txs, SpendingPeriod.year, now), 11131));
  test('income excluded', () => expect(spendingInPeriod([tx('2026-10-13', 50, type: 'income')], SpendingPeriod.year, now), 0));
  test('transactions after now excluded', () => expect(spendingInPeriod([tx('2026-10-20', -50)], SpendingPeriod.month, now), 0));
}
