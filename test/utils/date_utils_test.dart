import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/utils/date_utils.dart';

void main() {
  group('date utils', () {
    test('addDays adds the given number of days', () {
      expect(addDays(DateTime(2026, 1, 1), 7), DateTime(2026, 1, 8));
    });

    test('addMonths adds the given number of months', () {
      expect(addMonths(DateTime(2026, 1, 15), 1), DateTime(2026, 2, 15));
    });

    test('addMonths supports negative months', () {
      expect(addMonths(DateTime(2026, 3, 15), -1), DateTime(2026, 2, 15));
    });

    test('addMonths crossing a year boundary', () {
      expect(addMonths(DateTime(2026, 12, 1), 1), DateTime(2027, 1, 1));
      expect(addMonths(DateTime(2026, 1, 1), -1), DateTime(2025, 12, 1));
    });

    test('isBefore compares dates correctly', () {
      expect(isBefore(DateTime(2026, 1, 1), DateTime(2026, 1, 2)), true);
      expect(isBefore(DateTime(2026, 1, 2), DateTime(2026, 1, 1)), false);
    });

    test('nextOccurrence advances weekly/biweekly/monthly correctly', () {
      final start = DateTime(2026, 1, 1);
      expect(nextOccurrence(start, 'weekly'), DateTime(2026, 1, 8));
      expect(nextOccurrence(start, 'biweekly'), DateTime(2026, 1, 15));
      expect(nextOccurrence(start, 'monthly'), DateTime(2026, 2, 1));
    });
  });
}
