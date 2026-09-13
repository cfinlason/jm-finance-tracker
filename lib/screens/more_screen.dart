import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_card.dart';
import '../widgets/list_row.dart';
import '../stores/auth_store.dart';

class _MoreItem {
  final String label;
  final IconData icon;
  final String route;
  const _MoreItem({required this.label, required this.icon, required this.route});
}

const _items = [
  _MoreItem(label: 'Accounts', icon: LucideIcons.wallet, route: '/accounts'),
  _MoreItem(label: 'Categories', icon: LucideIcons.tag, route: '/categories'),
  _MoreItem(label: 'Recurring Bills', icon: LucideIcons.repeat, route: '/recurring'),
  _MoreItem(label: 'Notifications', icon: LucideIcons.bell, route: '/notifications'),
  _MoreItem(label: 'Settings', icon: LucideIcons.settings, route: '/settings'),
];

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authStore = context.watch<AuthStore>();

    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('More', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
            if (authStore.email != null) ...[
              const SizedBox(height: 4),
              Text('Signed in as ${authStore.email}', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ],
            const SizedBox(height: AppSpacing.lg),
            AppCard(
              child: Column(
                children: [
                  for (var i = 0; i < _items.length; i++)
                    ListRow(
                      icon: Icon(_items[i].icon, size: 16, color: AppColors.textSecondary),
                      title: _items[i].label,
                      showChevron: true,
                      isLast: i == _items.length - 1,
                      onTap: () => context.push(_items[i].route),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: ListRow(
                icon: const Icon(LucideIcons.logOut, size: 16, color: AppColors.warning),
                title: 'Sign Out',
                isLast: true,
                onTap: () => authStore.signOut(),
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(LucideIcons.info, size: 14, color: AppColors.textMuted),
                SizedBox(width: AppSpacing.sm),
                Text('JM Finance Tracker v1.0', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
