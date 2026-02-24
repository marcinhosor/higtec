import { useEffect, useState, useCallback } from "react";
import { db, THEME_PALETTES, type ThemePalette } from "@/lib/storage";

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function getActiveTheme(): ThemePalette {
  const company = db.getCompany();
  const canUseTheme = company.isPro || company.planTier === 'pro' || company.planTier === 'premium';
  if (!canUseTheme) return THEME_PALETTES[0]; // default
  return THEME_PALETTES.find(t => t.id === company.selectedThemeId) || THEME_PALETTES[0];
}

export function applyThemeToDOM(theme: ThemePalette) {
  const root = document.documentElement;
  root.style.setProperty('--primary', hexToHsl(theme.primary));
  // Keep foreground readable
  root.style.setProperty('--ring', hexToHsl(theme.primary));
  root.style.setProperty('--sidebar-primary', hexToHsl(theme.primary));
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePalette>(() => getActiveTheme());

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = useCallback((themeId: string) => {
    const company = db.getCompany();
    company.selectedThemeId = themeId;
    db.saveCompany(company);
    const t = THEME_PALETTES.find(p => p.id === themeId) || THEME_PALETTES[0];
    setThemeState(t);
    applyThemeToDOM(t);
  }, []);

  const refresh = useCallback(() => {
    const t = getActiveTheme();
    setThemeState(t);
    applyThemeToDOM(t);
  }, []);

  return { theme, setTheme, refresh, palettes: THEME_PALETTES };
}
