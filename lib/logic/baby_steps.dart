import '../models/models.dart';
import '../utils/money.dart';
import 'net_worth.dart';

enum StepState { done, current, locked }

class StepStatus {
  final int step;
  final String title;
  final StepState state;
  final double progress; // 0-1
  final String detail;
  final bool isManual;

  StepStatus({
    required this.step,
    required this.title,
    required this.state,
    required this.progress,
    required this.detail,
    required this.isManual,
  });
}

/// Monthly expense estimate: the larger of recurring bills normalized to a
/// month and the average expense total of the 3 full months before [now]'s month.
double estimateMonthlyExpenses({
  required List<RecurringRule> rules,
  required List<Transaction> transactions,
  required DateTime now,
}) {
  var recurring = 0.0;
  for (final r in rules) {
    final amt = r.amount.abs();
    switch (r.frequency) {
      case 'weekly':
        recurring += amt * 52 / 12;
      case 'biweekly':
        recurring += amt * 26 / 12;
      default:
        recurring += amt;
    }
  }

  final windowStart = DateTime(now.year, now.month - 3, 1);
  final windowEnd = DateTime(now.year, now.month, 1);
  var spent = 0.0;
  for (final t in transactions) {
    if (t.type != 'expense') continue;
    final d = DateTime.tryParse(t.date);
    if (d == null || d.isBefore(windowStart) || !d.isBefore(windowEnd)) continue;
    spent += t.amount.abs();
  }
  final average = spent / 3;
  return recurring > average ? recurring : average;
}

double _clamp01(double v) => v.isNaN ? 0 : v.clamp(0.0, 1.0).toDouble();

class _Raw {
  final String title;
  final bool done;
  final double progress;
  final String detail;
  final bool isManual;
  _Raw(this.title, this.done, this.progress, this.detail, {this.isManual = false});
}

List<StepStatus> computeBabySteps({
  required List<Account> accounts,
  required List<Debt> debts,
  required UserSettings settings,
  required double monthlyExpenses,
  required double? usdToJmdRate,
  required NetWorth netWorth,
}) {
  final emergency = accounts.where((a) => a.isEmergencyFund).fold<double>(0, (s, a) => s + a.balance);
  bool manual(int n) => settings.stepsCompleted[n] == true;

  // Step 1: starter emergency fund (USD target converted to JMD).
  final _Raw s1;
  final rate = usdToJmdRate;
  if (rate == null || rate <= 0) {
    s1 = _Raw('Starter emergency fund', false, 0, 'Exchange rate needed');
  } else {
    final target = settings.starterFundUsd * rate;
    final p = target <= 0 ? 1.0 : _clamp01(emergency / target);
    s1 = _Raw('Starter emergency fund', p >= 1, p, '${formatMoney(emergency)} of ${formatMoney(target)} (${formatUsd(settings.starterFundUsd)})');
  }

  // Step 2: pay off all non-mortgage debt.
  final consumer = debts.where((d) => !d.isMortgage).fold<double>(0, (s, d) => s + d.balance);
  final _Raw s2;
  if (consumer <= 0) {
    s2 = _Raw('Pay off all debt (except the house)', true, 1, 'No debt besides the mortgage');
  } else {
    final baseline = settings.step2StartTotal > consumer ? settings.step2StartTotal : consumer;
    final p = _clamp01(1 - consumer / baseline);
    s2 = _Raw('Pay off all debt (except the house)', false, p, '${formatMoney(consumer)} left of ${formatMoney(baseline)}');
  }

  // Step 3: full emergency fund.
  final _Raw s3;
  if (monthlyExpenses <= 0) {
    s3 = _Raw('Full emergency fund', false, 0, 'Add bills to set a target');
  } else {
    final target = settings.emergencyMonths * monthlyExpenses;
    final p = target <= 0 ? 1.0 : _clamp01(emergency / target);
    s3 = _Raw('Full emergency fund', emergency >= target, p,
        '${formatMoney(emergency)} of ${formatMoney(target)} (${settings.emergencyMonths} months)');
  }

  // Steps 4-6: manual.
  final s4 = _Raw('Invest 15% for retirement', manual(4), manual(4) ? 1 : 0,
      'Target: 15% of income = ${formatMoney(settings.monthlyIncomeEstimate * 0.15)}/mo',
      isManual: true);
  final s5 = _Raw("Save for children's college", manual(5), manual(5) ? 1 : 0,
      manual(5) ? 'Marked complete' : 'Mark complete when on track',
      isManual: true);

  final mortgages = debts.where((d) => d.isMortgage).toList();
  final mortgageBalance = mortgages.fold<double>(0, (s, d) => s + d.balance);
  final original = settings.stepAmounts[6];
  final _Raw s6;
  if (manual(6)) {
    s6 = _Raw('Pay off home early', true, 1, 'Marked complete', isManual: true);
  } else if (mortgages.isNotEmpty && original != null) {
    final base = original > mortgageBalance ? original : mortgageBalance;
    final p = base <= 0 ? 1.0 : _clamp01(1 - mortgageBalance / base);
    s6 = _Raw('Pay off home early', false, p, '${formatMoney(mortgageBalance)} left on mortgage', isManual: true);
  } else if (mortgages.isNotEmpty) {
    s6 = _Raw('Pay off home early', false, 0, '${formatMoney(mortgageBalance)} left on mortgage', isManual: true);
  } else {
    s6 = _Raw('Pay off home early', false, 0, 'Mark complete when your home is paid off', isManual: true);
  }

  // Step 7: build wealth toward the net-worth goal.
  final p7 = _clamp01(netWorth.progress);
  final s7 = _Raw('Build wealth and give', p7 >= 1, p7,
      netWorth.usd == null
          ? 'Exchange rate needed'
          : '${formatUsd(netWorth.usd!)} of ${formatUsd(settings.netWorthGoalUsd)}');

  final raws = [s1, s2, s3, s4, s5, s6, s7];
  final result = <StepStatus>[];
  var currentAssigned = false;
  for (var i = 0; i < raws.length; i++) {
    final r = raws[i];
    final StepState state;
    if (r.done) {
      state = StepState.done;
    } else if (!currentAssigned) {
      state = StepState.current;
      currentAssigned = true;
    } else {
      state = StepState.locked;
    }
    result.add(StepStatus(step: i + 1, title: r.title, state: state, progress: r.progress, detail: r.detail, isManual: r.isManual));
  }
  return result;
}
