import { useEffect, useState, useCallback } from "react";
import { THEME_PALETTES, DEFAULT_CUSTOM_THEME, type ThemePalette, type CustomTheme } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

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

export function resolveTheme(
  planTier: string | null | undefined,
  selectedThemeId: string | null | undefined,
  customTheme: any | null | undefined
): ThemePalette {
  const canUseTheme = planTier === 'pro' || planTier === 'premium';
  if (!canUseTheme) return THEME_PALETTES[0];

  if (customTheme?.enabled && planTier === 'premium') {
    return {
      id: 'custom',
      name: 'Personalizado',
      primary: customTheme.primary,
      secondary: customTheme.secondary,
      accent: customTheme.accent,
      background: customTheme.background,
      cta: customTheme.cta,
    };
  }

  return THEME_PALETTES.find(t => t.id === selectedThemeId) || THEME_PALETTES[0];
}

export function applyThemeToDOM(theme: ThemePalette) {
  const root = document.documentElement;
  root.style.setProperty('--primary', hexToHsl(theme.primary));
  root.style.setProperty('--ring', hexToHsl(theme.primary));
  root.style.setProperty('--sidebar-primary', hexToHsl(theme.primary));
  root.style.setProperty('--accent', hexToHsl(theme.accent));
  root.style.setProperty('--theme-secondary', hexToHsl(theme.secondary));
  root.style.setProperty('--theme-bg', hexToHsl(theme.background));
  root.style.setProperty('--gradient-from', theme.primary);
  root.style.setProperty('--gradient-to', theme.cta || theme.accent);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePalette>(THEME_PALETTES[0]);
  const [cloudCompany, setCloudCompany] = useState<{
    planTier?: string;
    selectedThemeId?: string;
    customTheme?: any;
  } | null>(null);

  // Load theme from cloud on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile?.company_id || cancelled) return;
      const { data: company } = await supabase
        .from("companies")
        .select("plan_tier, selected_theme_id, custom_theme")
        .eq("id", profile.company_id)
        .maybeSingle();
      if (!company || cancelled) return;
      setCloudCompany({
        planTier: company.plan_tier,
        selectedThemeId: company.selected_theme_id ?? 'default',
        customTheme: company.custom_theme,
      });
      const t = resolveTheme(company.plan_tier, company.selected_theme_id, company.custom_theme);
      setThemeState(t);
      applyThemeToDOM(t);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = useCallback((themeId: string) => {
    const t = THEME_PALETTES.find(p => p.id === themeId) || THEME_PALETTES[0];
    setThemeState(t);
    applyThemeToDOM(t);
  }, []);

  const setCustomTheme = useCallback((custom: CustomTheme) => {
    const t: ThemePalette = {
      id: 'custom',
      name: 'Personalizado',
      primary: custom.primary,
      secondary: custom.secondary,
      accent: custom.accent,
      background: custom.background,
      cta: custom.cta,
    };
    setThemeState(t);
    applyThemeToDOM(t);
  }, []);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.company_id) return;
    const { data: company } = await supabase
      .from("companies")
      .select("plan_tier, selected_theme_id, custom_theme")
      .eq("id", profile.company_id)
      .maybeSingle();
    if (!company) return;
    const t = resolveTheme(company.plan_tier, company.selected_theme_id, company.custom_theme);
    setThemeState(t);
    applyThemeToDOM(t);
  }, []);

  return { theme, setTheme, setCustomTheme, refresh, palettes: THEME_PALETTES };
}
