import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../supabase_config.dart';

/// Tracks the current Supabase auth session and exposes sign up / sign in /
/// sign out. This is the gate the router checks before letting anyone past
/// the login screen — see app_router.dart's redirect logic.
class AuthStore extends ChangeNotifier {
  Session? _session;
  bool _initialized = false;
  String? _error;
  late final StreamSubscription<AuthState> _authSub;

  AuthStore() {
    _session = supabase.auth.currentSession;
    _initialized = true;
    _authSub = supabase.auth.onAuthStateChange.listen((state) {
      _session = state.session;
      notifyListeners();
    });
  }

  bool get isInitialized => _initialized;
  bool get isSignedIn => _session != null;
  String? get userId => _session?.user.id;
  String? get email => _session?.user.email;
  String? get error => _error;

  /// True only for the sign-up call that just created a brand-new account
  /// (as opposed to a returning sign-in) — the caller uses this to decide
  /// whether to run the one-time local-data migration.
  Future<bool> signUp({required String email, required String password}) async {
    _error = null;
    try {
      final res = await supabase.auth.signUp(email: email, password: password);
      return res.user != null;
    } on AuthException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> signIn({required String email, required String password}) async {
    _error = null;
    try {
      await supabase.auth.signInWithPassword(email: email, password: password);
      return true;
    } on AuthException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    }
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _authSub.cancel();
    super.dispose();
  }
}
