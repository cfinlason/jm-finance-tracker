import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const bg = Color(0xFF101110);
  static const surface = Color(0xFF1B1D18);
  static const surfaceMuted = Color(0x0FFFFFFF); // rgba(255,255,255,0.06)
  static const text = Color(0xFFF4F5F0);
  static const textSecondary = Color(0xFFC7C9C2);
  static const textMuted = Color(0xFF8B8D86);
  static const accent = Color(0xFFCFFF3B);
  static const accentInk = Color(0xFF101110);
  static const warning = Color(0xFFFFB020);
  static const warningBorder = Color(0x66FFB020); // rgba(255,176,32,0.4)
  static const border = Color(0x1FFFFFFF); // rgba(255,255,255,0.12)
  static const borderStrong = Color(0x24FFFFFF); // rgba(255,255,255,0.14)
  static const borderHairline = Color(0x14FFFFFF); // rgba(255,255,255,0.08)
}

class AppSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const sm2 = 10.0;
  static const md = 12.0;
  static const md2 = 14.0;
  static const lg = 16.0;
  static const xl = 20.0;
  static const xxl = 24.0;
  static const xxxl = 32.0;
}

class AppRadius {
  static const sm = 11.0;
  static const md = 14.0;
  static const lg = 19.0;
  static const pill = 999.0;
}

class AppTypography {
  static TextStyle get hero => GoogleFonts.archivo(fontSize: 60, height: 1.0, fontWeight: FontWeight.w800, letterSpacing: -1.2, color: AppColors.text);
  static TextStyle get sectionStat => GoogleFonts.archivo(fontSize: 22, height: 1.1, fontWeight: FontWeight.w800, color: AppColors.text);
  static TextStyle get cardTitle => GoogleFonts.archivo(fontSize: 24, height: 1.2, fontWeight: FontWeight.w700, color: AppColors.text);
  static TextStyle get subHeader => GoogleFonts.archivo(fontSize: 21, height: 1.2, fontWeight: FontWeight.w700, color: AppColors.text);
  static TextStyle get body => GoogleFonts.archivo(fontSize: 14, height: 1.4, fontWeight: FontWeight.w400, color: AppColors.text);
  static TextStyle get bodyStrong => GoogleFonts.archivo(fontSize: 14, height: 1.4, fontWeight: FontWeight.w600, color: AppColors.text);
  static TextStyle get caption => GoogleFonts.archivo(fontSize: 10, height: 1.2, fontWeight: FontWeight.w600, letterSpacing: 1.1, color: AppColors.textMuted);
  static TextStyle get amount => GoogleFonts.archivo(
        fontSize: 16,
        height: 1.2,
        fontWeight: FontWeight.w800,
        color: AppColors.text,
        fontFeatures: const [FontFeature.tabularFigures()],
      );
}

ThemeData buildAppTheme() {
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.bg,
    fontFamily: GoogleFonts.archivo().fontFamily,
    colorScheme: const ColorScheme.dark(
      primary: AppColors.accent,
      onPrimary: AppColors.accentInk,
      surface: AppColors.surface,
      onSurface: AppColors.text,
    ),
  );
  return base;
}
