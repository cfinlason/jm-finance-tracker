import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, Palette } from './tokens';
import { useStore } from '../data/store';
import { setCurrency } from '../data/format';

const Ctx = createContext<Palette>(light);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useStore((s) => s.settings.theme);
  const currency = useStore((s) => s.settings.currency);
  // Set synchronously so formatters are correct on this very render; the fresh palette object below
  // makes every themed component re-render when the currency changes.
  setCurrency(currency);
  const palette = useMemo(() => {
    const mode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
    return { ...(mode === 'dark' ? dark : light) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pref, system, currency]);
  return <Ctx.Provider value={palette}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
