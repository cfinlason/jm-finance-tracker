import 'dart:math';

String generateId() {
  final timePart = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
  final randPart = Random().nextInt(1 << 32).toRadixString(36).padLeft(6, '0');
  return '$timePart-$randPart';
}
