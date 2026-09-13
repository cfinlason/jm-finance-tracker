import 'package:flutter/foundation.dart';

/// Ephemeral, non-persisted UI state used to preview the balance effect of
/// an in-progress *new* transaction before it's saved. The Add Transaction
/// dialog updates this as the user picks an account/amount; the Home
/// dashboard's accounts sidebar reads it to show a live "this is what your
/// balance would become" preview next to the account being debited/credited.
///
/// Scoped to new transactions only — editing an existing transaction would
/// require netting against the transaction's original effect (and handling
/// the case where the account itself changes), which is a lot of complexity
/// for a preview that's meant to be a quick visual aid. Edits fall back to
/// the plain, non-previewed balance.
class TransactionPreviewStore extends ChangeNotifier {
  String? _accountId;
  double _delta = 0;

  /// The account currently targeted by an in-progress new-transaction edit,
  /// or null if no preview is active.
  String? get accountId => _accountId;

  /// The signed amount that would be applied to [accountId] if the
  /// in-progress edit were saved right now.
  double get delta => _delta;

  void setPreview({required String accountId, required double delta}) {
    if (_accountId == accountId && _delta == delta) return;
    _accountId = accountId;
    _delta = delta;
    notifyListeners();
  }

  void clear() {
    if (_accountId == null && _delta == 0) return;
    _accountId = null;
    _delta = 0;
    notifyListeners();
  }
}
