import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/stores/error_banner_store.dart';
import 'package:jm_finance_tracker/stores/exchange_rate_store.dart';
import 'package:jm_finance_tracker/stores/settings_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  SettingsStore makeSettings() => SettingsStore(ErrorBannerStore());

  test('refresh success sets rate and clears failure', () async {
    final s = makeSettings();
    final store = ExchangeRateStore(s, fetcher: () async => 157.3);
    await store.refresh();
    expect(store.rate, 157.3);
    expect(store.refreshFailed, false);
    expect(store.isLoading, false);
    expect(store.updatedAt, isNotNull);
    expect(s.settings.cachedUsdJmdRate, 157.3);
  });

  test('refresh failure keeps cached rate', () async {
    final s = makeSettings();
    s.setCachedRate(150.0, DateTime.now().toUtc());
    final store = ExchangeRateStore(s, fetcher: () async => throw Exception('x'));
    store.loadCached();
    await store.refresh();
    expect(store.rate, 150.0);
    expect(store.refreshFailed, true);
    expect(store.isLoading, false);
  });

  test('refresh failure with no cache leaves null and does not throw', () async {
    final store = ExchangeRateStore(makeSettings(), fetcher: () async => throw Exception('x'));
    await store.refresh();
    expect(store.rate, isNull);
    expect(store.refreshFailed, true);
  });

  test('loadCached picks up cached rate', () {
    final s = makeSettings();
    s.setCachedRate(155.5, DateTime.now().toUtc());
    final store = ExchangeRateStore(s, fetcher: () async => 1);
    expect(store.rate, isNull);
    store.loadCached();
    expect(store.rate, 155.5);
    expect(store.updatedAt, isNotNull);
  });

  for (final bad in [0.0, double.nan, -3.0]) {
    test('refresh rejects invalid rate $bad', () async {
      final s = makeSettings();
      final store = ExchangeRateStore(s, fetcher: () async => bad);
      await store.refresh();
      expect(store.rate, isNull);
      expect(store.refreshFailed, true);
      expect(s.settings.cachedUsdJmdRate, isNull);
    });
  }

  test('overlapping refresh calls fetch once', () async {
    var calls = 0;
    final store = ExchangeRateStore(makeSettings(), fetcher: () async {
      calls++;
      await Future<void>.delayed(const Duration(milliseconds: 10));
      return 157.0;
    });
    await Future.wait([store.refresh(), store.refresh()]);
    expect(calls, 1);
    expect(store.rate, 157.0);
  });
}
