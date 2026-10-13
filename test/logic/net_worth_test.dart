import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/logic/net_worth.dart';
import 'package:jm_finance_tracker/models/models.dart';

Account acct(double b) => Account(id: 'a$b', name: 'A', type: 'savings', balance: b, createdAt: '2026-01-01');
Debt debt(double b) => Debt(id: 'd$b', name: 'D', balance: b, interestRate: 0, minPayment: 0, dueDayOfMonth: 1);

void main() {
  test('sums accounts minus debts and converts', () {
    final nw = computeNetWorth(accounts: [acct(300), acct(200)], debts: [debt(100)], usdToJmdRate: 100, goalUsd: 1000);
    expect(nw.jmd, 400);
    expect(nw.usd, 4);
    expect(nw.progress, closeTo(0.004, 1e-12));
  });
  test('rate null gives null usd and zero progress', () {
    final nw = computeNetWorth(accounts: [acct(300)], debts: [], usdToJmdRate: null, goalUsd: 1000);
    expect(nw.usd, isNull);
    expect(nw.progress, 0);
  });
  test('debts exceeding accounts -> negative jmd, zero progress', () {
    final nw = computeNetWorth(accounts: [acct(100)], debts: [debt(500)], usdToJmdRate: 100, goalUsd: 1000);
    expect(nw.jmd, -400);
    expect(nw.progress, 0);
  });
  test('zero goal does not divide by zero', () {
    final nw = computeNetWorth(accounts: [acct(100)], debts: [], usdToJmdRate: 100, goalUsd: 0);
    expect(nw.progress, 0);
  });
  test('progress clamps to 1', () {
    final nw = computeNetWorth(accounts: [acct(1000000)], debts: [], usdToJmdRate: 1, goalUsd: 10);
    expect(nw.progress, 1);
  });
}
