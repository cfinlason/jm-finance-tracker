/// Converts US dollars to Jamaican dollars. [rate] is JMD per 1 USD.
double usdToJmd(double usd, double rate) {
  if (rate <= 0) throw ArgumentError.value(rate, 'rate', 'must be > 0');
  return usd * rate;
}

/// Converts Jamaican dollars to US dollars. [rate] is JMD per 1 USD.
double jmdToUsd(double jmd, double rate) {
  if (rate <= 0) throw ArgumentError.value(rate, 'rate', 'must be > 0');
  return jmd / rate;
}
