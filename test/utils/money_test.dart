import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/utils/money.dart';

void main() {
  group('formatMoney', () {
    test('formats a positive amount with commas and two decimals', () {
      expect(formatMoney(1234.5), 'J\$1,234.50');
    });

    test('formats a negative amount with a leading minus', () {
      expect(formatMoney(-42), '-J\$42.00');
    });

    test('formats zero', () {
      expect(formatMoney(0), 'J\$0.00');
    });

    test('formats large amounts with multiple comma groups', () {
      expect(formatMoney(1234567.89), 'J\$1,234,567.89');
    });
  });
}
