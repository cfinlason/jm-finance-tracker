import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class GoalsStore extends ChangeNotifier {
  static const _key = 'goals-store';
  final ErrorBannerStore errorBanner;

  GoalsStore(this.errorBanner);

  List<Goal> _goals = [];
  bool _hasHydrated = false;

  List<Goal> get goals => List.unmodifiable(_goals);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _goals = list.map((e) => Goal.fromJson(e as Map<String, dynamic>)).toList();
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_goals.map((g) => g.toJson()).toList()), errorBanner);

  String addGoal({required String name, required String icon, required double targetAmount, String? targetDate}) {
    final id = generateId();
    final goal = Goal(id: id, name: name, icon: icon, targetAmount: targetAmount, currentAmount: 0, targetDate: targetDate);
    _goals = [..._goals, goal];
    notifyListeners();
    _persist();
    return id;
  }

  void updateGoal(String id, {String? name, double? targetAmount}) {
    _goals = _goals.map((g) => g.id == id ? g.copyWith(name: name, targetAmount: targetAmount) : g).toList();
    notifyListeners();
    _persist();
  }

  void removeGoal(String id) {
    _goals = _goals.where((g) => g.id != id).toList();
    notifyListeners();
    _persist();
  }

  void incrementCurrentAmount(String id, double amount) {
    _goals = _goals.map((g) => g.id == id ? g.copyWith(currentAmount: g.currentAmount + amount) : g).toList();
    notifyListeners();
    _persist();
  }
}
