import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/list_row.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../widgets/category_icon.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/transactions_store.dart';
import '../stores/categories_store.dart';
import '../stores/accounts_store.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  String _query = '';
  String _accountFilter = 'all';

  @override
  Widget build(BuildContext context) {
    final transactions = context.watch<TransactionsStore>().transactions;
    final categories = context.watch<CategoriesStore>().categories;
    final accounts = context.watch<AccountsStore>().accounts;

    Category? categoryFor(String id) {
      for (final c in categories) {
        if (c.id == id) return c;
      }
      return null;
    }

    final filtered = transactions.where((t) {
      final category = categoryFor(t.categoryId);
      final matchesQuery = _query.isEmpty ||
          t.note.toLowerCase().contains(_query.toLowerCase()) ||
          (category?.name.toLowerCase().contains(_query.toLowerCase()) ?? false);
      final matchesAccount = _accountFilter == 'all' || t.accountId == _accountFilter;
      return matchesQuery && matchesAccount;
    }).toList()
      ..sort((a, b) => b.date.compareTo(a.date));

    final grouped = <String, List<Transaction>>{};
    for (final t in filtered) {
      grouped.putIfAbsent(t.date.substring(0, 10), () => []).add(t);
    }
    final days = grouped.keys.toList();

    return AppScreen(
      scroll: false,
      padded: false,
      child: Column(
        children: [
          const SizedBox(height: AppSpacing.xl),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: AppSpacing.xl),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('Transactions', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(14)),
              child: Row(
                children: [
                  const Icon(LucideIcons.search, size: 16, color: AppColors.textMuted),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: TextField(
                      onChanged: (v) => setState(() => _query = v),
                      style: const TextStyle(color: AppColors.text),
                      decoration: const InputDecoration(
                        hintText: 'Search transactions',
                        hintStyle: TextStyle(color: AppColors.textMuted),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(vertical: AppSpacing.md),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
            child: AppSegmentedControl<String>(
              options: [
                const SegmentOption(label: 'All Accounts', value: 'all'),
                for (final a in accounts) SegmentOption(label: a.name, value: a.id),
              ],
              value: _accountFilter,
              onChanged: (v) => setState(() => _accountFilter = v),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Expanded(
            child: days.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                    child: EmptyState(
                      icon: const IconChip(child: Icon(LucideIcons.plus, size: 16, color: AppColors.textMuted)),
                      message: 'No transactions match.',
                      ctaLabel: 'Add Transaction',
                      onPressCta: () => context.push('/transaction/new'),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(AppSpacing.xl, 0, AppSpacing.xl, AppSpacing.xxxl),
                    children: [
                      for (final day in days) ...[
                        Padding(
                          padding: const EdgeInsets.only(top: AppSpacing.md, bottom: AppSpacing.xs),
                          child: Text(day, style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                        ),
                        for (final t in grouped[day]!)
                          AppCard(
                            margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                            child: ListRow(
                              icon: CategoryIcon(name: categoryFor(t.categoryId)?.icon ?? 'more-horizontal'),
                              title: categoryFor(t.categoryId)?.name ?? 'Uncategorized',
                              caption: t.note,
                              amount: t.amount,
                              isLast: true,
                              onTap: () => context.push('/transaction/${t.id}'),
                            ),
                          ),
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
