import 'package:flutter/widgets.dart';
import 'package:lucide_icons/lucide_icons.dart';

final Map<String, IconData> iconMap = {
  'utensils': LucideIcons.utensils,
  'car': LucideIcons.car,
  'receipt': LucideIcons.receipt,
  'shopping-bag': LucideIcons.shoppingBag,
  'film': LucideIcons.film,
  'heart-pulse': LucideIcons.heartPulse,
  'home': LucideIcons.home,
  'wallet': LucideIcons.wallet,
  'arrow-left-right': LucideIcons.arrowLeftRight,
  'more-horizontal': LucideIcons.moreHorizontal,
  'target': LucideIcons.target,
};

IconData getIcon(String name) => iconMap[name] ?? LucideIcons.moreHorizontal;
