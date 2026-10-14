import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, Palette } from './tokens';
import { useStore } from '../data/store';

const Ctx = createContext<Palette>(light);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useStore((s) => s.settings.theme);
  const palette = useMemo(() => {
    const mode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
    return mode === 'dark' ? dark : light;
  }, [pref, system]);
  return <Ctx.Provider value={palette}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
