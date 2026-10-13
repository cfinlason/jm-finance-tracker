import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/models/models.dart';

void main() {
  group('UserSettings Baby Steps fields', () {
    test('fromSupabaseRow({}) yields defaults', () {
      final s = UserSettings.fromSupabaseRow({});
      expect(s.starterFundUsd, 1000);
      expect(s.emergencyMonths, 3);
      expect(s.netWorthGoalUsd, 1000000);
      expect(s.stepsCompleted, isEmpty);
      expect(s.stepAmounts, isEmpty);
      expect(s.step2StartTotal, 0);
      expect(s.cachedUsdJmdRate, isNull);
      expect(s.rateUpdatedAt, isNull);
    });

    test('parses jsonb maps with string keys', () {
      final s = UserSettings.fromSupabaseRow({
        'steps_completed': {'4': true},
        'step_amounts': {'5': 1200},
        'cached_usd_jmd_rate': 157,
        'rate_updated_at': '2026-10-13T00:00:00Z',
      });
      expect(s.stepsCompleted[4], true);
      expect(s.stepAmounts[5], 1200.0);
      expect(s.cachedUsdJmdRate, 157.0);
      expect(s.rateUpdatedAt, '2026-10-13T00:00:00Z');
    });

    test('copyWith updates new fields', () {
      final s = UserSettings().copyWith(emergencyMonths: 6, stepsCompleted: {1: true});
      expect(s.emergencyMonths, 6);
      expect(s.stepsCompleted[1], true);
    });
  });

  group('flags', () {
    test('Account reads/writes is_emergency_fund', () {
      final a = Account.fromSupabaseRow({
        'id': 'a', 'name': 'n', 'type': 'savings', 'balance': 1, 'created_at': 'x', 'is_emergency_fund': true,
      });
      expect(a.isEmergencyFund, true);
      expect(a.toSupabaseInsert()['is_emergency_fund'], true);
      expect(a.copyWith(isEmergencyFund: false).isEmergencyFund, false);
    });

    test('Debt reads/writes is_mortgage', () {
      final d = Debt.fromSupabaseRow({
        'id': 'd', 'name': 'n', 'balance': 1, 'interest_rate': 1, 'min_payment': 1, 'due_day_of_month': 1, 'is_mortgage': true,
      });
      expect(d.isMortgage, true);
      expect(d.toSupabaseInsert()['is_mortgage'], true);
      expect(d.copyWith(isMortgage: false).isMortgage, false);
    });
  });
}
