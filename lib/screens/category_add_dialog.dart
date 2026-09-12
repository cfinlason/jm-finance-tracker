import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/categories_store.dart';

class CategoryAddDialog extends StatefulWidget {
  const CategoryAddDialog({super.key});

  @override
  State<CategoryAddDialog> createState() => _CategoryAddDialogState();
}

class _CategoryAddDialogState extends State<CategoryAddDialog> {
  String _name = '';
  String _kind = 'expense';

  @override
  Widget build(BuildContext context) {
    final categoriesStore = context.watch<CategoriesStore>();

    void handleSave() {
      if (_name.isEmpty) return;
      categoriesStore.addCategory(_name, 'more-horizontal', _kind == 'income');
      Navigator.of(context).pop();
    }

    return AppDialog(
      title: 'Add Category',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
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
