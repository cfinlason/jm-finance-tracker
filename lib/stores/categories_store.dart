import 'dart:convert';
import 'package:flutter/foundation.dart' hide Category;
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

final List<Category> presetCategories = [
  Category(id: 'preset-food', name: 'Food', icon: 'utensils', isCustom: false, isIncome: false),
  Category(id: 'preset-transport', name: 'Transport', icon: 'car', isCustom: false, isIncome: false),
  Category(id: 'preset-bills', name: 'Bills & Utilities', icon: 'receipt', isCustom: false, isIncome: false),
  Category(id: 'preset-shopping', name: 'Shopping', icon: 'shopping-bag', isCustom: false, isIncome: false),
  Category(id: 'preset-entertainment', name: 'Entertainment', icon: 'film', isCustom: false, isIncome: false),
  Category(id: 'preset-health', name: 'Health', icon: 'heart-pulse', isCustom: false, isIncome: false),
  Category(id: 'preset-housing', name: 'Housing', icon: 'home', isCustom: false, isIncome: false),
  Category(id: 'preset-income', name: 'Income', icon: 'wallet', isCustom: false, isIncome: true),
  Category(id: 'preset-transfer', name: 'Transfer', icon: 'arrow-left-right', isCustom: false, isIncome: false),
  Category(id: 'preset-other', name: 'Other', icon: 'more-horizontal', isCustom: false, isIncome: false),
];

class CategoriesStore extends ChangeNotifier {
  static const _key = 'categories-store';
  final ErrorBannerStore errorBanner;

  CategoriesStore(this.errorBanner);

  List<Category> _categories = presetCategories;
  bool _hasHydrated = false;

  List<Category> get categories => List.unmodifiable(_categories);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _categories = list.map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_categories.map((c) => c.toJson()).toList()), errorBanner);

  void addCategory(String name, String icon, bool isIncome) {
    final category = Category(id: generateId(), name: name, icon: icon, isCustom: true, isIncome: isIncome);
    _categories = [..._categories, category];
    notifyListeners();
    _persist();
  }

  void removeCategory(String id) {
    _categories = _categories.where((c) => c.id != id).toList();
    notifyListeners();
    _persist();
  }
}
