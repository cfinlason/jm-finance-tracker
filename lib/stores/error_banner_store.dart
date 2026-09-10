import 'package:flutter/foundation.dart';

class ErrorBannerStore extends ChangeNotifier {
  String? _message;
  String? get message => _message;

  void show(String message) {
    _message = message;
    notifyListeners();
  }

  void hide() {
    _message = null;
    notifyListeners();
  }
}
