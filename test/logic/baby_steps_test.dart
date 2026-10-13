import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/logic/baby_steps.dart';
import 'package:jm_finance_tracker/logic/net_worth.dart';
import 'package:jm_finance_tracker/models/models.dart';

Account acct(double b, {bool ef = false}) =>
    Account(id: 'a$b$ef', name: 'A', type: 'savings', balance: b, createdAt: '2026-01-01', isEmergencyFund: ef);
Debt debt(double b, {bool mortgage = false}) =>
    Debt(id: 'd$b$mortgage', name: 'D', balance: b, interestRate: 0, minPayment: 0, dueDayOfMonth: 1, isMortgage: mortgage);
RecurringRule rule(double amt, String freq) =>
    RecurringRule(id: 'r$amt$freq', name: 'R', categoryId: 'c', accountId: 'a', amount: amt, frequency: freq, nextDueDate: '2026-11-01');
Transaction tx(String date, double amount, {String type = 'expense'}) =>
    Transaction(id: '$date$type$amount', accountId: 'a', categoryId: 'c', amount: amount, note: '', date: date, type: type);

final zeroNw = NetWorth(jmd: 0, usd: 0, progress: 0);

List<StepStatus> run({
  List<Account> accounts = const [],
  List<Debt> debts = const [],
  UserSettings? settings,
  double monthlyExpenses = 1000,
  double? rate = 160,
  NetWorth? netWorth,
}) =>
    computeBabySteps(
      accounts: accounts,
      debts: debts,
      settings: settings ?? UserSettings(),
      monthlyExpenses: monthlyExpenses,
      usdToJmdRate: rate,
      netWorth: netWorth ?? zeroNw,
    );

void main() {
  group('computeBabySteps', () {
    test('returns exactly 7 steps in order with non-empty titles and details', () {
      final s = run();
      expect(s.map((e) => e.step), [1, 2, 3, 4, 5, 6, 7]);
      for (final e in s) {
        expect(e.detail, isNotEmpty);
        expect(e.title, isNotEmpty);
      }
    });
    test('(a) emergency J\$80,000 at rate 160 -> step 1 progress 0.5, current', () {
      final s = run(accounts: [acct(80000, ef: true)]);
      expect(s[0].progress, 0.5);
      expect(s[0].state, StepState.current);
    });
    test('(b) no tagged accounts -> step 1 progress 0', () {
      expect(run(accounts: [acct(500000)])[0].progress, 0);
    });
    test('(c) rate null -> Exchange rate needed', () {
      final s = run(accounts: [acct(80000, ef: true)], rate: null);
      expect(s[0].progress, 0);
      expect(s[0].detail, 'Exchange rate needed');
    });
    test('(d) only a mortgage -> step 2 done, step 6 detail not empty', () {
      final s = run(debts: [debt(5000000, mortgage: true)]);
      expect(s[1].state, StepState.done);
      expect(s[1].progress, 1);
      expect(s[5].detail, isNotEmpty);
    });
    test('(e) debts 1000, baseline 2000 -> step 2 progress 0.5', () {
      final s = run(debts: [debt(600), debt(400)], settings: UserSettings(step2StartTotal: 2000));
      expect(s[1].progress, 0.5);
    });
    test('(f) debts 3000, baseline 2000 -> progress 0 (baseline 3000)', () {
      final s = run(debts: [debt(3000)], settings: UserSettings(step2StartTotal: 2000));
      expect(s[1].progress, 0);
      expect(s[1].state, isNot(StepState.done));
    });
    test('step 2 zero baseline and zero debt total -> done, no NaN', () {
      final s = run(debts: [debt(0)], settings: UserSettings(step2StartTotal: 0));
      expect(s[1].state, StepState.done);
      expect(s[1].progress, 1);
    });
    test('(g) expenses 0 -> step 3 not done with exact detail', () {
      final s = run(accounts: [acct(999999, ef: true)], monthlyExpenses: 0);
      expect(s[2].state, isNot(StepState.done));
      expect(s[2].progress, 0);
      expect(s[2].detail, 'Add bills to set a target');
    });
    test('(h) emergency total >= 3x expenses -> step 3 done', () {
      final s = run(accounts: [acct(3000, ef: true)], monthlyExpenses: 1000);
      expect(s[2].state, StepState.done);
      expect(s[2].progress, 1);
    });
    test('(i) stepsCompleted {4:true} -> step 4 done', () {
      final s = run(settings: UserSettings(stepsCompleted: {4: true}));
      expect(s[3].state, StepState.done);
      expect(s[3].progress, 1);
      expect(s[4].progress, 0);
    });
    test('step 4 detail states 15% income target', () {
      final s = run(settings: UserSettings(monthlyIncomeEstimate: 550000));
      expect(s[3].detail, 'Target: 15% of income = J\$82,500.00/mo');
    });
    test('step 6 with mortgage and stepAmounts[6] -> computed progress', () {
      final s = run(debts: [debt(750, mortgage: true)], settings: UserSettings(stepAmounts: {6: 1000}));
      expect(s[5].progress, closeTo(0.25, 1e-12));
    });
    test('step 6 zero mortgage and zero stepAmount does not divide by zero', () {
      final s = run(debts: [debt(0, mortgage: true)], settings: UserSettings(stepAmounts: {6: 0}));
      expect(s[5].progress.isNaN, isFalse);
    });
    test('step 7 follows net worth progress, done at 1', () {
      expect(run(netWorth: NetWorth(jmd: 1, usd: 1, progress: 0.3))[6].progress, 0.3);
      expect(run(netWorth: NetWorth(jmd: 1, usd: 1, progress: 1))[6].state, StepState.done);
    });
    test('(j) exactly one current step; later non-done steps locked', () {
      final s = run(accounts: [acct(160000, ef: true)], monthlyExpenses: 100000, settings: UserSettings(stepsCompleted: {5: true}));
      expect(s.where((e) => e.state == StepState.current).length, 1);
      final idx = s.indexWhere((e) => e.state == StepState.current);
      expect(idx, 2); // steps 1 and 2 done (no debts), step 3 current
      for (final e in s.skip(idx + 1)) {
        expect(e.state, anyOf(StepState.locked, StepState.done));
      }
      expect(s[4].state, StepState.done);
      expect(s[5].state, StepState.locked);
    });
    test('isManual only on steps 4-6', () {
      expect(run().map((e) => e.isManual), [false, false, false, true, true, true, false]);
    });
    test('zero starter fund does not divide by zero', () {
      expect(run(settings: UserSettings(starterFundUsd: 0))[0].progress.isNaN, isFalse);
    });
  });

  group('estimateMonthlyExpenses', () {
    final now = DateTime(2026, 10, 14);
    test('monthly 100 + weekly 100 -> >= 100 + 100*52/12', () {
      final v = estimateMonthlyExpenses(rules: [rule(100, 'monthly'), rule(100, 'weekly')], transactions: [], now: now);
      expect(v, greaterThanOrEqualTo(100 + 100 * 52 / 12 - 1e-9));
    });
    test('biweekly normalizes x26/12', () {
      expect(estimateMonthlyExpenses(rules: [rule(120, 'biweekly')], transactions: [], now: now), closeTo(260, 1e-9));
    });
    test('transactions only -> average of 3 prior full months', () {
      final v = estimateMonthlyExpenses(rules: [], transactions: [
        tx('2026-07-05', -300),
        tx('2026-08-05', -300),
        tx('2026-09-30T23:00:00', -300),
        tx('2026-10-02', -9999), // current month excluded
        tx('2026-06-30', -9999), // too old
        tx('2026-08-10', 5000, type: 'income'),
      ], now: now);
      expect(v, 300);
    });
    test('rules dominate when larger', () {
      final v = estimateMonthlyExpenses(rules: [rule(5000, 'monthly')], transactions: [tx('2026-09-05', -300)], now: now);
      expect(v, 5000);
    });
    test('nothing -> 0', () => expect(estimateMonthlyExpenses(rules: [], transactions: [], now: now), 0));
  });
}
