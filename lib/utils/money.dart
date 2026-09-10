String formatMoney(double amount) {
  final sign = amount < 0 ? '-' : '';
  final abs = amount.abs();
  final fixed = abs.toStringAsFixed(2);
  final parts = fixed.split('.');
  final withCommas = _addThousandsSeparators(parts[0]);
  return '${sign}J\$$withCommas.${parts[1]}';
}

String _addThousandsSeparators(String intPart) {
  final reversed = intPart.split('').reversed.toList();
  final buffer = StringBuffer();
  for (var i = 0; i < reversed.length; i++) {
    if (i != 0 && i % 3 == 0) buffer.write(',');
    buffer.write(reversed[i]);
  }
  return buffer.toString().split('').reversed.join();
}
