import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/theme/breakpoints.dart';

void main() {
  group('windowSizeForWidth', () {
    test('returns compact below the breakpoint', () {
      expect(windowSizeForWidth(839), WindowSize.compact);
    });

    test('returns expanded at and above the breakpoint', () {
      expect(windowSizeForWidth(840), WindowSize.expanded);
      expect(windowSizeForWidth(1280), WindowSize.expanded);
    });
  });
}
