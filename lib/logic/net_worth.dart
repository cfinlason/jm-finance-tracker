import '../models/models.dart';
import 'currency.dart';

class NetWorth {
  final double jmd;
  final double? usd;
  final double progress; // 0-1 toward the USD net-worth goal

  NetWorth({required this.jmd, required this.usd, required this.progress});
}

NetWorth computeNetWorth({
  required List<Account> accounts,
  required List<Debt> debts,
  required double? usdToJmdRate,
  required double goalUsd,
}) {
  final assets = accounts.fold<double>(0, (s, a) => s + a.balance);
  final owed = debts.fold<double>(0, (s, d) => s + d.balance);
  final jmd = assets - owed;
  final rate = usdToJmdRate;
  final usd = (rate == null || rate <= 0) ? null : jmdToUsd(jmd, rate);
  final progress = (usd == null || usd <= 0 || goalUsd <= 0) ? 0.0 : (usd / goalUsd).clamp(0.0, 1.0).toDouble();
  return NetWorth(jmd: jmd, usd: usd, progress: progress);
}
