// Allot design system.
// Signature accent: "Jade". Display type: Fraunces. UI type: Inter.
// Depth is built from three surface layers (bg → surface → raised) plus soft, tinted shadows.

export type Palette = {
  mode: 'light' | 'dark';
  bg: string; // app background
  surface: string; // cards
  raised: string; // sheets, popovers, active pills
  sunken: string; // inputs, tracks
  line: string; // hairlines
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string; // signature jade
  accentStrong: string; // pressed / text-on-light
  accentSoft: string; // tinted fills
  onAccent: string;
  income: string;
  expense: string; // warm coral — "spent"
  warn: string; // amber — "close to limit"
  danger: string;
  info: string;
  chart: string[]; // categorical palette
  shadow: string;
  overlay: string;
  heroFrom: string;
  heroTo: string;
};

export const light: Palette = {
  mode: 'light',
  bg: '#F4F1EA',
  surface: '#FFFFFF',
  raised: '#FFFFFF',
  sunken: '#ECE8DE',
  line: '#E3DED1',
  text: '#10221C',
  textMuted: '#5B6B64',
  textFaint: '#8E9A94',
  accent: '#0E9F76',
  accentStrong: '#087A5A',
  accentSoft: '#DDF3EA',
  onAccent: '#FFFFFF',
  income: '#0E9F76',
  expense: '#E4572E',
  warn: '#D98A0B',
  danger: '#D6343F',
  info: '#3B6FD8',
  chart: ['#0E9F76', '#3B6FD8', '#E4572E', '#D98A0B', '#8A5CD6', '#17A2B8', '#D6409F', '#6B7A33'],
  shadow: '#0B3B2B',
  overlay: 'rgba(16,34,28,0.45)',
  heroFrom: '#0E9F76',
  heroTo: '#0A6E55',
};

export const dark: Palette = {
  mode: 'dark',
  bg: '#08110E',
  surface: '#101C17',
  raised: '#17261F',
  sunken: '#0C1511',
  line: '#1F3029',
  text: '#EAF4EF',
  textMuted: '#9DB0A8',
  textFaint: '#6A7D75',
  accent: '#3DDBA8',
  accentStrong: '#7AEBC6',
  accentSoft: '#12332A',
  onAccent: '#032118',
  income: '#3DDBA8',
  expense: '#FF8A66',
  warn: '#F2B84B',
  danger: '#FF6B76',
  info: '#7EA6FF',
  chart: ['#3DDBA8', '#7EA6FF', '#FF8A66', '#F2B84B', '#B79BFF', '#5FD3E6', '#FF7DC4', '#B5C96A'],
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
  heroFrom: '#14C490',
  heroTo: '#0B5E48',
};

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, huge: 40, giant: 56 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const font = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  displayItalic: 'Fraunces_500Medium_Italic',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type TextVariant =
  | 'hero' | 'display' | 'title' | 'headline' | 'body' | 'bodyStrong' | 'callout' | 'caption' | 'overline' | 'money' | 'moneyLg' | 'moneyHero';

export const type: Record<TextVariant, { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number; textTransform?: 'uppercase' }> = {
  hero: { fontFamily: font.displayBold, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  display: { fontFamily: font.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  title: { fontFamily: font.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  headline: { fontFamily: font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 16, lineHeight: 23 },
  callout: { fontFamily: font.medium, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 16 },
  overline: { fontFamily: font.semibold, fontSize: 11.5, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' },
  money: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
  moneyLg: { fontFamily: font.displayBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  moneyHero: { fontFamily: font.displayBold, fontSize: 48, lineHeight: 54, letterSpacing: -1.4 },
};

export const shadow = (p: Palette, level: 1 | 2 | 3) => {
  const dark = p.mode === 'dark';
  const cfg = {
    1: { o: dark ? 0.35 : 0.07, r: 8, y: 2 },
    2: { o: dark ? 0.45 : 0.1, r: 18, y: 8 },
    3: { o: dark ? 0.6 : 0.16, r: 30, y: 16 },
  }[level];
  return { shadowColor: p.shadow, shadowOpacity: cfg.o, shadowRadius: cfg.r, shadowOffset: { width: 0, height: cfg.y }, elevation: level * 3 };
};

// Spring presets used across the app so motion feels like one system.
export const spring = {
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  soft: { damping: 20, stiffness: 180, mass: 0.9 },
  bouncy: { damping: 11, stiffness: 160, mass: 0.8 },
} as const;
