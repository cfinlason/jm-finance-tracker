import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/logic/currency.dart';

void main() {
  test('usdToJmd converts at rate', () => expect(usdToJmd(1000, 160), 160000));
  test('jmdToUsd converts at rate', () => expect(jmdToUsd(160000, 160), 1000));
  test('rate 0 or negative throws ArgumentError', () {
    expect(() => usdToJmd(1, 0), throwsArgumentError);
    expect(() => jmdToUsd(1, 0), throwsArgumentError);
    expect(() => jmdToUsd(1, -5), throwsArgumentError);
  });
}
