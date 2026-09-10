import '../models/models.dart';

class PayoffResult {
  final int months;
  final double totalInterest;
  PayoffResult({required this.months, required this.totalInterest});
}

class DebtPayoffProjection {
  final PayoffResult snowball;
  final PayoffResult avalanche;
  DebtPayoffProjection({required this.snowball, required this.avalanche});
}

const _maxMonths = 600; // 50-year safety cap against infinite loops

class _WorkingDebt {
  double balance;
  final double interestRate;
  final double minPayment;
  _WorkingDebt({required this.balance, required this.interestRate, required this.minPayment});
}

PayoffResult _simulate(List<Debt> debts, double extraPayment, bool isSnowball) {
  final order = debts
      .map((d) => _WorkingDebt(balance: d.balance, interestRate: d.interestRate, minPayment: d.minPayment))
      .toList();
  if (isSnowball) {
    order.sort((a, b) => a.balance.compareTo(b.balance));
  } else {
    order.sort((a, b) => b.interestRate.compareTo(a.interestRate));
  }

  var months = 0;
  var totalInterest = 0.0;

  while (order.any((d) => d.balance > 0.01) && months < _maxMonths) {
    months++;
    for (final debt in order) {
      if (debt.balance <= 0) continue;
      final monthlyInterest = debt.balance * (debt.interestRate / 100 / 12);
      totalInterest += monthlyInterest;
      debt.balance += monthlyInterest;
      debt.balance -= debt.balance < debt.minPayment ? debt.balance : debt.minPayment;
    }
    var remainingExtra = extraPayment;
    for (final debt in order) {
      if (remainingExtra <= 0) break;
      if (debt.balance <= 0) continue;
      final applied = debt.balance < remainingExtra ? debt.balance : remainingExtra;
      debt.balance -= applied;
      remainingExtra -= applied;
    }
  }

  return PayoffResult(months: months, totalInterest: (totalInterest * 100).round() / 100);
}

DebtPayoffProjection projectDebtPayoff(List<Debt> debts, double extraPayment) {
  return DebtPayoffProjection(
    snowball: _simulate(debts, extraPayment, true),
    avalanche: _simulate(debts, extraPayment, false),
  );
}
