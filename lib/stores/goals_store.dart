import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../supabase_config.dart';
import 'error_banner_store.dart';

class GoalsStore extends ChangeNotifier {
  static const _table = 'goals';
  final ErrorBannerStore errorBanner;

  GoalsStore(this.errorBanner);

  List<Goal> _goals = [];
  bool _hasHydrated = false;

  List<Goal> get goals => List.unmodifiable(_goals);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    try {
      final rows = await supabase.from(_table).select().order('created_at');
      _goals = (rows as List).map((r) => Goal.fromSupabaseRow(r as Map<String, dynamic>)).toList();
    } catch (_) {
      _goals = [];
      errorBanner.show("Couldn't load saved data — starting fresh");
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _insert(Goal goal) async {
    try {
      await supabase.from(_table).insert(goal.toSupabaseInsert());
    } catch (_) {
      errorBanner.show("Couldn't save — try again");
    }
  }

  Future<void> _update(String id, Map<String, dynamic> patch) async {
    try {
      await supabase.from(_table).update(patch).eq('id', id);
    } catch (_) {
      errorBanner.show("Couldn't save — try again");
    }
  }

  Future<void> _delete(String id) async {
    try {
      await supabase.from(_table).delete().eq('id', id);
    } catch (_) {
      errorBanner.show("Couldn't delete — try again");
    }
  }

  String addGoal({required String name, required String icon, required double targetAmount, String? targetDate}) {
    final id = generateId();
    final goal = Goal(id: id, name: name, icon: icon, targetAmount: targetAmount, currentAmount: 0, targetDate: targetDate);
    _goals = [..._goals, goal];
    notifyListeners();
    _insert(goal);
    return id;
  }

  void updateGoal(String id, {String? name, double? targetAmount}) {
    _goals = _goals.map((g) => g.id == id ? g.copyWith(name: name, targetAmount: targetAmount) : g).toList();
    notifyListeners();
    _update(id, {
      'name': ?name,
      'target_amount': ?targetAmount,
    });
  }

  void removeGoal(String id) {
    _goals = _goals.where((g) => g.id != id).toList();
    notifyListeners();
    _delete(id);
  }

  void incrementCurrentAmount(String id, double amount) {
    Goal? existing;
    for (final g in _goals) {
      if (g.id == id) {
        existing = g;
        break;
      }
    }
    if (existing == null) return;
    final newAmount = existing.currentAmount + amount;
    _goals = _goals.map((g) => g.id == id ? g.copyWith(currentAmount: newAmount) : g).toList();
    notifyListeners();
    _update(id, {'current_amount': newAmount});
  }

  Future<void> migrateIn(List<Goal> localGoals) async {
    if (localGoals.isEmpty) return;
    _goals = localGoals;
    notifyListeners();
    try {
      await supabase.from(_table).insert(localGoals.map((g) => g.toSupabaseInsert()).toList());
    } catch (_) {
      errorBanner.show("Couldn't finish moving your data to the cloud — try again");
    }
  }
}
