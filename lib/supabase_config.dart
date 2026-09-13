import 'package:supabase_flutter/supabase_flutter.dart';

/// Project URL and publishable (anon) key for the app's Supabase backend.
/// Safe to ship in the client — every table is protected by Row Level
/// Security, so this key alone grants no access to anyone else's data.
const _supabaseUrl = 'https://jqxwsejvdigtjenmiwcb.supabase.co';
const _supabaseAnonKey = 'sb_publishable_xh_d6bE2RdvgKNbE9C6NWA_FoSz1AiR';

Future<void> initSupabase() async {
  await Supabase.initialize(url: _supabaseUrl, publishableKey: _supabaseAnonKey);
}

/// Shorthand for the initialized client, used throughout the stores.
SupabaseClient get supabase => Supabase.instance.client;
