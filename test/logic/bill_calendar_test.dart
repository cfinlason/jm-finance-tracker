import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/logic/bill_calendar.dart';
import 'package:jm_finance_tracker/models/models.dart';

RecurringRule _rule({
  String id = 'r1',
  required String nextDueDate,
  String frequency = 'monthly',
}) =>
    RecurringRule(
      id: id,
      name: 'Bill',
      categoryId: 'c1',
      accountId: 'a1',
      amount: 100,
      frequency: frequency,
      nextDueDate: nextDueDate,
    );

void main() {
  group('occurrencesInMonth', () {
    test('includes a monthly rule whose next due date is in the target month', () {
      final rules = [_rule(nextDueDate: DateTime(2026, 9, 15).toIso8601String())];
      final occ = occurrencesInMonth(rules, DateTime(2026, 9, 1));
      expect(occ.length, 1);
      expect(occ.first.date, DateTime(2026, 9, 15));
    });

    test('projects a monthly rule backward into an earlier target month', () {
      final rules = [_rule(nextDueDate: DateTime(2026, 12, 20).toIso8601String())];
      final occ = occurrencesInMonth(rules, DateTime(2026, 9, 1));
      expect(occ.length, 1);
      expect(occ.first.date, DateTime(2026, 9, 20));
    });

    test('projects a monthly rule forward into a later target month', () {
      final rules = [_rule(nextDueDate: DateTime(2026, 1, 5).toIso8601String())];
      final occ = occurrencesInMonth(rules, DateTime(2026, 9, 1));
      expect(occ.length, 1);
      expect(occ.first.date, DateTime(2026, 9, 5));
    });

    test('a weekly rule can produce multiple occurrences in one month', () {
      final rules = [_rule(nextDueDate: DateTime(2026, 9, 1).toIso8601String(), frequency: 'weekly')];
      final occ = occurrencesInMonth(rules, DateTime(2026, 9, 1));
      // Sept 2026 has 30 days: weekly from the 1st lands on 1, 8, 15, 22, 29.
      expect(occ.map((o) => o.date.day).toList(), [1, 8, 15, 22, 29]);
    });

    test('clamps a 31st-of-the-month rule into a shorter month instead of skipping it', () {
      // Due on the 31st monthly; addMonths clamps the day to the shorter
      // month's last day (see date_utils.addMonths), so September's
      // occurrence lands on the 30th rather than being skipped.
      final rules = [_rule(nextDueDate: DateTime(2026, 8, 31).toIso8601String())];
      final occ = occurrencesInMonth(rules, DateTime(2026, 9, 1));
      expect(occ.length, 1);
      expect(occ.first.date, DateTime(2026, 9, 30));
    });

    test('results are sorted by date across multiple rules', () {
      final rules = [
        _rule(id: 'late', nextDueDate: DateTime(2026, 9, 25).toIso8601String()),
        _rule(id: 'early', nextDueDate: DateTime(2026, 9, 3).toIso8601String()),
      ];
      final occ = occurrencesInMonth(rules, DateTime(2026, 9, 1));
      expect(occ.map((o) => o.rule.id).toList(), ['early', 'late']);
    });
  });
}
