import 'package:flutter/foundation.dart' hide Category;
import '../models/models.dart';
import '../utils/id.dart';
import '../supabase_config.dart';
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
  static const _table = 'categories';
  final ErrorBannerStore errorBanner;

  CategoriesStore(this.errorBanner);

  List<Category> _categories = [];
  bool _hasHydrated = false;

  List<Category> get categories => List.unmodifiable(_categories);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    try {
      final rows = await supabase.from(_table).select().order('created_at');
      final fetched = (rows as List).map((r) => Category.fromSupabaseRow(r as Map<String, dynamic>)).toList();
      if (fetched.isEmpty) {
        // Brand-new account with nothing migrated in yet — seed the presets
        // once so the app isn't empty on first login.
        await seedPresets();
        _categories = presetCategories;
      } else {
        _categories = fetched;
      }
    } catch (_) {
      _categories = [];
      errorBanner.show("Couldn't load saved data — starting fresh");
    }
    _hasHydrated = true;
    notifyListeners();
  }

  /// Inserts the preset category rows for a brand-new user. Safe to call
  /// more than once by accident (e.g. a race on first login) since it's
  /// only ever invoked when the fetched list was empty.
  Future<void> seedPresets() async {
    try {
      await supabase.from(_table).insert(presetCategories.map((c) => c.toSupabaseInsert()).toList());
    } catch (_) {
      errorBanner.show("Couldn't set up default categories — try again");
    }
  }

  Future<void> _insert(Category category) async {
    try {
      await supabase.from(_table).insert(category.toSupabaseInsert());
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

  void addCategory(String name, String icon, bool isIncome) {
    final category = Category(id: generateId(), name: name, icon: icon, isCustom: true, isIncome: isIncome);
    _categories = [..._categories, category];
    notifyListeners();
    _insert(category);
  }

  void removeCategory(String id) {
    _categories = _categories.where((c) => c.id != id).toList();
    notifyListeners();
    _delete(id);
  }

  /// Uploads a migrated local category list wholesale (which already
  /// includes the presets plus any custom ones the user had added), instead
  /// of separately seeding presets.
  Future<void> migrateIn(List<Category> localCategories) async {
    if (localCategories.isEmpty) {
      await seedPresets();
      _categories = presetCategories;
      notifyListeners();
      return;
    }
    _categories = localCategories;
    notifyListeners();
    try {
      await supabase.from(_table).insert(localCategories.map((c) => c.toSupabaseInsert()).toList());
    } catch (_) {
      errorBanner.show("Couldn't finish moving your data to the cloud — try again");
    }
  }
}
