import React from 'react';
import {
  Baby, Banknote, BookOpen, Car, Coffee, Coins, CreditCard, Dumbbell, Flame, Fuel, Gem, Gift, GraduationCap, HeartPulse, House, Landmark, Music,
  PartyPopper, PawPrint, PiggyBank, Plane, Receipt, Scissors, Shield, Shirt, ShoppingCart, Smartphone, Sparkles, Sprout, Target, TrendingUp, Tv,
  Umbrella, Utensils, Wallet, Wrench, Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { IconKey } from '../data/types';

export const ICONS: Record<IconKey, LucideIcon> = {
  home: House, zap: Zap, cart: ShoppingCart, car: Car, food: Utensils, health: HeartPulse, shield: Shield, phone: Smartphone, tv: Tv, gift: Gift,
  piggy: PiggyBank, plane: Plane, school: GraduationCap, baby: Baby, paw: PawPrint, wallet: Wallet, cash: Banknote, trend: TrendingUp, card: CreditCard,
  bank: Landmark, coffee: Coffee, shirt: Shirt, wrench: Wrench, sparkles: Sparkles, music: Music, book: BookOpen, flame: Flame, fuel: Fuel,
  dumbbell: Dumbbell, scissors: Scissors, party: PartyPopper, umbrella: Umbrella, gem: Gem, sprout: Sprout, coins: Coins, target: Target, receipt: Receipt,
};

export const ICON_CHOICES = Object.keys(ICONS) as IconKey[];

export function Icon({ name, size = 20, color, strokeWidth = 2 }: { name: IconKey; size?: number; color: string; strokeWidth?: number }) {
  const C = ICONS[name] ?? Receipt;
  return <C size={size} color={color} strokeWidth={strokeWidth} />;
}
