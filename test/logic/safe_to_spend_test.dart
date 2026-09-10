import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/logic/safe_to_spend.dart';
import 'package:jm_finance_tracker/models/models.dart';

Account _account(double balance, {String id = 'a1'}) => Account(
      id: id,
      name: 'Checking',
      type: 'checking',
      balance: balance,
      createdAt: '2026-01-01T00:00:00.000Z',
    );

RecurringRule _rule(double amount, String nextDueDate) => RecurringRule(
      id: 'r1',
      name: 'Rent',
      categoryId: 'c1',
      accountId: 'a1',
      amount: amount,
      frequency: 'monthly',
      nextDueDate: nextDueDate,
    );

void main() {
  final now = DateTime(2026, 1, 1);

  group('calculateSafeToSpend', () {
    test('subtracts bills due before the next expected income date', () {
      final accounts = [_account(10000)];
      final rules = [_rule(3000, '2026-01-15T00:00:00.000Z')];
      expect(calculateSafeToSpend(accounts, rules, now: now), 7000);
    });

    test('ignores bills due after the next expected income date', () {
      final accounts = [_account(10000)];
      final rules = [_rule(3000, '2026-03-01T00:00:00.000Z')];
      expect(calculateSafeToSpend(accounts, rules, now: now), 10000);
    });

    test('sums balances across multiple accounts', () {
      final accounts = [_account(5000, id: 'a1'), _account(2000, id: 'a2')];
      expect(calculateSafeToSpend(accounts, [], now: now), 7000);
    });
  });
}
