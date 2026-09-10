import 'package:shared_preferences/shared_preferences.dart';
import '../stores/error_banner_store.dart';

Future<String?> loadJson(String key, ErrorBannerStore errorBanner) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  } catch (_) {
    errorBanner.show("Couldn't load — try again");
    return null;
  }
}

Future<void> saveJson(String key, String value, ErrorBannerStore errorBanner) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
  } catch (_) {
    errorBanner.show("Couldn't save — try again");
  }
}
