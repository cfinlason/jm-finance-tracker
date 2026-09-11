import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/utils/id.dart';

void main() {
  group('generateId', () {
    test('never throws and always returns a non-empty String (1000 calls)', () {
      for (var i = 0; i < 1000; i++) {
        expect(() => generateId(), returnsNormally);
        final id = generateId();
        expect(id, isA<String>());
        expect(id, isNotEmpty);
      }
    });

    test('back-to-back calls do not produce the exact same string', () {
      final seen = <String>{};
      for (var i = 0; i < 1000; i++) {
        final id = generateId();
        expect(seen.contains(id), isFalse, reason: 'duplicate id generated: $id');
        seen.add(id);
      }
    });
  });
}
