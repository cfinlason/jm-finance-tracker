import 'dart:math';

String generateId() {
  final timePart = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
  // Note: `1 << 32` is avoided here. On Flutter Web (dart2js/dartdevc),
  // Dart's ints are represented as JS numbers, and `Random.nextInt`'s max
  // must satisfy `0 < max <= 2^32` as evaluated by the web runtime; using
  // exactly `1 << 32` has been observed to throw
  // `RangeError: max must be in range 0 < max ≤ 2^32` on web. `1 << 31`
  // (2^31) is unambiguously within range on every target (VM and web)
  // while still giving ample entropy for a single local user's ids.
  final randPart = Random().nextInt(1 << 31).toRadixString(36).padLeft(6, '0');
  return '$timePart-$randPart';
}
