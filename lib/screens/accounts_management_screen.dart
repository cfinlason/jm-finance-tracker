import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_card.dart';
import '../widgets/list_row.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../stores/accounts_store.dart';

class AccountsManagementScreen extends StatelessWidget {
  const AccountsManagementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final accounts = context.watch<AccountsStore>().accounts;

    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Accounts', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
                IconButton(icon: const Icon(LucideIcons.plus, color: AppColors.accent), onPressed: () => context.push('/accounts/new')),
              ],
            ),
            if (accounts.isEmpty)
              EmptyState(
                icon: const IconChip(child: Icon(LucideIcons.wallet, size: 16, color: AppColors.textMuted)),
                message: 'No accounts yet.',
                ctaLabel: 'Add Account',
                onPressCta: () => context.push('/accounts/new'),
              )
            else
              AppCard(
                child: Column(
                  children: [
                    for (var i = 0; i < accounts.length; i++)
                      ListRow(
                        icon: const Icon(LucideIcons.wallet, size: 16, color: AppColors.textSecondary),
                        title: accounts[i].name,
                        caption: accounts[i].type,
                        amount: accounts[i].balance,
                        isLast: i == accounts.length - 1,
                        onTap: () => context.push('/accounts/${accounts[i].id}'),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
