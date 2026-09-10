import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../utils/icon_map.dart';

class CategoryIcon extends StatelessWidget {
  final String name;
  final double size;

  const CategoryIcon({super.key, required this.name, this.size = 16});

  @override
  Widget build(BuildContext context) {
    return Icon(getIcon(name), size: size, color: AppColors.textSecondary);
  }
}
