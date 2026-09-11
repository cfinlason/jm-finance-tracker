import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jm_finance_tracker/stores/accounts_store.dart';
import 'package:jm_finance_tracker/stores/error_banner_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AccountsStore.hydrate', () {
    test('recovers from malformed stored JSON instead of throwing', () async {
      SharedPreferences.setMockInitialValues({'accounts-store': 'not valid json{{{'});
      final errorBanner = ErrorBannerStore();
      final store = AccountsStore(errorBanner);

      await store.hydrate();

      expect(store.hasHydrated, isTrue);
      expect(store.accounts, isEmpty);
      expect(errorBanner.message, isNotNull);
    });

    test('loads normally when stored JSON is valid', () async {
      SharedPreferences.setMockInitialValues({
        'accounts-store': '[{"id":"a1","name":"Cash","type":"cash","balance":100.0,"createdAt":"2024-01-01T00:00:00.000"}]',
      });
      final errorBanner = ErrorBannerStore();
      final store = AccountsStore(errorBanner);

      await store.hydrate();

      expect(store.hasHydrated, isTrue);
      expect(store.accounts, hasLength(1));
      expect(store.accounts.first.name, 'Cash');
      expect(errorBanner.message, isNull);
    });
  });
}
