import '../models/models.dart';
import '../utils/date_utils.dart' as date_utils;

double calculateSafeToSpend(List<Account> accounts, List<RecurringRule> recurringRules, {DateTime? now}) {
  final effectiveNow = now ?? DateTime.now();
  final totalBalance = accounts.fold<double>(0, (sum, a) => sum + a.balance);
  final nextIncomeDate = date_utils.addMonths(effectiveNow, 1);
  final upcomingBills = recurringRules
      .where((r) => date_utils.isBefore(DateTime.parse(r.nextDueDate), nextIncomeDate))
      .fold<double>(0, (sum, r) => sum + r.amount);
  return totalBalance - upcomingBills;
}
