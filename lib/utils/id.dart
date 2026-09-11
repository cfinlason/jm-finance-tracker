import 'dart:math';

String generateId() {
  final timePart = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
  // Note: `Random().nextInt(1 << 32)` was originally used here. On Flutter
  // Web (dart2js/dartdevc) that expression's value was observed to
  // evaluate `1 << 32` itself to 0, so `Random.nextInt` received `max: 0`
  // and threw `RangeError: max must be in range 0 < max ≤ 2^32, was 0`.
  // The exact root mechanism (how the web compiler's bit-shift semantics
  // produced 0 there) was never fully diagnosed. Rather than pick another
  // shift-based constant near a power-of-two boundary (e.g. `1 << 31`) and
  // risk carrying over the same unconfirmed mechanism, this uses a plain
  // base-10 integer literal with no bit-shift arithmetic at all. One
  // billion is comfortably within range on every Dart compilation target
  // (VM or web, present or future) and still gives ample entropy for a
  // single local user's ids.
  final randPart = Random().nextInt(1000000000).toRadixString(36).padLeft(6, '0');
  return '$timePart-$randPart';
}
