import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AppFormField extends StatefulWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final TextInputType keyboardType;
  final String? placeholder;
  final String? error;
  final bool obscureText;

  const AppFormField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.keyboardType = TextInputType.text,
    this.placeholder,
    this.error,
    this.obscureText = false,
  });

  @override
  State<AppFormField> createState() => _AppFormFieldState();
}

class _AppFormFieldState extends State<AppFormField> {
  late final TextEditingController _controller = TextEditingController(text: widget.value);

  @override
  void didUpdateWidget(AppFormField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != _controller.text) {
      _controller.text = widget.value;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
        const SizedBox(height: AppSpacing.xs),
        TextFormField(
          controller: _controller,
          onChanged: widget.onChanged,
          keyboardType: widget.keyboardType,
          obscureText: widget.obscureText,
          style: const TextStyle(color: AppColors.text, fontSize: 15),
          decoration: InputDecoration(
            hintText: widget.placeholder,
            hintStyle: const TextStyle(color: AppColors.textMuted),
            contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md), borderSide: const BorderSide(color: AppColors.border)),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(color: widget.error != null ? AppColors.warning : AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md), borderSide: const BorderSide(color: AppColors.accent)),
          ),
        ),
        if (widget.error != null)
          Padding(padding: const EdgeInsets.only(top: 4), child: Text(widget.error!, style: const TextStyle(color: AppColors.warning, fontSize: 12))),
      ],
    );
  }
}
