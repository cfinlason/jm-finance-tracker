import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/stores/accounts_store.dart';
import 'package:jm_finance_tracker/stores/error_banner_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AccountsStore.hydrate', () {
    // These stores now fetch from Supabase rather than local storage (see
    // lib/supabase_config.dart). There's no live Supabase project to test
    // against here, so this only covers the contract that matters for a
    // unit test: hydrate() never throws — even when Supabase itself hasn't
    // been initialized, which is exactly this test environment — and
    // always leaves the store in a valid, observable state.
    test('never throws and always settles hasHydrated, even with no Supabase session', () async {
      final errorBanner = ErrorBannerStore();
      final store = AccountsStore(errorBanner);

      await store.hydrate();

      expect(store.hasHydrated, isTrue);
      expect(store.accounts, isEmpty);
      expect(errorBanner.message, isNotNull);
    });
  });
}
