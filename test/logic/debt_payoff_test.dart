import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/logic/debt_payoff.dart';
import 'package:jm_finance_tracker/models/models.dart';

Debt _debt({String id = 'd1', double balance = 1200, double interestRate = 0, double minPayment = 100}) => Debt(
      id: id,
      name: 'Card',
      balance: balance,
      interestRate: interestRate,
      minPayment: minPayment,
      dueDayOfMonth: 1,
    );

void main() {
  group('projectDebtPayoff', () {
    test('pays off a single zero-interest debt in balance/minPayment months', () {
      final debts = [_debt(balance: 1200, minPayment: 100)];
      final result = projectDebtPayoff(debts, 0);
      expect(result.snowball.months, 12);
      expect(result.snowball.totalInterest, 0);
    });

    test('avalanche never accrues more total interest than snowball for the same debts', () {
      final debts = [
        _debt(id: 'd1', balance: 500, interestRate: 5, minPayment: 50),
        _debt(id: 'd2', balance: 3000, interestRate: 22, minPayment: 100),
      ];
      final result = projectDebtPayoff(debts, 200);
      expect(result.avalanche.totalInterest <= result.snowball.totalInterest, true);
    });

    test('extra payments reduce months to debt-free', () {
      final debts = [_debt(balance: 1200, minPayment: 100, interestRate: 0)];
      final withoutExtra = projectDebtPayoff(debts, 0);
      final withExtra = projectDebtPayoff(debts, 200);
      expect(withExtra.snowball.months < withoutExtra.snowball.months, true);
    });
  });
}
