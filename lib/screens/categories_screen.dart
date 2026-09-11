import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/list_row.dart';
import '../widgets/category_icon.dart';
import '../stores/categories_store.dart';

class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final categoriesStore = context.watch<CategoriesStore>();
    final categories = categoriesStore.categories;

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Categories', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
              IconButton(icon: const Icon(LucideIcons.plus, color: AppColors.accent), onPressed: () => context.push('/categories/add')),
            ],
          ),
          AppCard(
            child: Column(
              children: [
                for (var i = 0; i < categories.length; i++)
                  ListRow(
                    icon: CategoryIcon(name: categories[i].icon),
                    title: categories[i].name,
                    caption: categories[i].isCustom ? 'Custom — tap to remove' : 'Preset',
                    isLast: i == categories.length - 1,
                    onTap: categories[i].isCustom ? () => categoriesStore.removeCategory(categories[i].id) : null,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
