import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/categories_store.dart';

class CategoryAddScreen extends StatefulWidget {
  const CategoryAddScreen({super.key});

  @override
  State<CategoryAddScreen> createState() => _CategoryAddScreenState();
}

class _CategoryAddScreenState extends State<CategoryAddScreen> {
  String _name = '';
  String _kind = 'expense';

  @override
  Widget build(BuildContext context) {
    final categoriesStore = context.watch<CategoriesStore>();

    void handleSave() {
      if (_name.isEmpty) return;
      categoriesStore.addCategory(_name, 'more-horizontal', _kind == 'income');
      context.pop();
    }

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Add Category', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.lg),
          AppFormField(label: 'Category name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Subscriptions'),
          const SizedBox(height: AppSpacing.md),
          AppSegmentedControl<String>(
            options: const [SegmentOption(label: 'Expense', value: 'expense'), SegmentOption(label: 'Income', value: 'income')],
            value: _kind,
            onChanged: (v) => setState(() => _kind = v),
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: _name.isNotEmpty ? handleSave : null),
        ],
      ),
    );
  }
}
