import { useState } from "react";
import { THEME_PALETTES, DEFAULT_CUSTOM_THEME, type ThemePalette, type CustomTheme } from "@/lib/storage";
import { Check, Palette, Lock, Sliders } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  selectedId: string;
  onSelect: (id: string) => void;
  canChange: boolean;
  isPremium?: boolean;
  customTheme?: CustomTheme;
  onCustomTheme?: (theme: CustomTheme) => void;
};

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg border shrink-0 cursor-pointer relative overflow-hidden">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="w-full h-full" style={{ backgroundColor: value }} />
      </div>
      <div className="flex-1 min-w-0">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input
          value={value}
          onChange={e => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
          }}
          className="h-7 text-xs font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export default function ThemeSelector({ selectedId, onSelect, canChange, isPremium, customTheme, onCustomTheme }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState<CustomTheme>(customTheme || DEFAULT_CUSTOM_THEME);

  const updateCustom = (key: keyof CustomTheme, value: string) => {
    setCustom(prev => ({ ...prev, [key]: value }));
  };

  const applyCustom = () => {
    if (onCustomTheme) {
      onCustomTheme({ ...custom, enabled: true });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Personalização Visual</h2>
          <p className="text-xs text-muted-foreground">
            {canChange ? "Escolha a paleta de cores do sistema e PDFs" : "Disponível nos planos PRO e PREMIUM"}
          </p>
        </div>
      </div>

      {/* Palette grid */}
      <div className="grid grid-cols-1 gap-2">
        {THEME_PALETTES.map((p) => {
          const isSelected = selectedId === p.id && !showCustom;
          const isDefault = p.id === 'default';
          const locked = !canChange && !isDefault;

          return (
            <button
              key={p.id}
              onClick={() => { if (!locked) { onSelect(p.id); setShowCustom(false); } }}
              disabled={locked}
              className={`relative flex items-center gap-3 rounded-xl border-2 p-3 transition-all text-left ${
                isSelected
                  ? "border-primary shadow-card-hover"
                  : locked
                  ? "border-border opacity-50 cursor-not-allowed"
                  : "border-border hover:border-primary/40 hover:shadow-card"
              }`}
            >
              <div className="flex gap-1 shrink-0">
                <div className="h-8 w-8 rounded-lg border" style={{ backgroundColor: p.primary }} />
                <div className="h-8 w-8 rounded-lg border" style={{ backgroundColor: p.secondary }} />
                <div className="h-8 w-8 rounded-lg border" style={{ backgroundColor: p.accent }} />
                <div className="h-8 w-8 rounded-lg border" style={{ backgroundColor: p.background }} />
              </div>
              <span className="text-sm font-medium text-foreground flex-1">{p.name}</span>
              {isSelected && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
            </button>
          );
        })}
      </div>

      {/* Custom Color Picker - Premium Only */}
      {isPremium && (
        <div className="mt-4 border-t pt-4">
          <button
            onClick={() => setShowCustom(!showCustom)}
            className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 transition-all text-left ${
              showCustom || selectedId === 'custom'
                ? "border-primary shadow-card-hover"
                : "border-border hover:border-primary/40 hover:shadow-card"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
              <Sliders className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground">🎨 Personalização Avançada</span>
              <p className="text-xs text-muted-foreground">Configure cada cor manualmente com HEX</p>
            </div>
            {selectedId === 'custom' && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </button>

          {showCustom && (
            <div className="mt-3 space-y-3 rounded-xl border p-4 bg-card animate-fade-in">
              <p className="text-xs font-medium text-muted-foreground mb-2">Selecione as cores ou insira o código HEX:</p>
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Primária (Botões)" value={custom.primary} onChange={v => updateCustom('primary', v)} />
                <ColorField label="Secundária (Menus)" value={custom.secondary} onChange={v => updateCustom('secondary', v)} />
                <ColorField label="CTA (Destaques)" value={custom.cta} onChange={v => updateCustom('cta', v)} />
                <ColorField label="Fundo" value={custom.background} onChange={v => updateCustom('background', v)} />
                <ColorField label="Texto" value={custom.textColor} onChange={v => updateCustom('textColor', v)} />
                <ColorField label="Cards" value={custom.cardColor} onChange={v => updateCustom('cardColor', v)} />
              </div>

              {/* Live preview */}
              <div className="mt-3 rounded-xl border p-3" style={{ backgroundColor: custom.background }}>
                <p className="text-xs font-medium mb-2" style={{ color: custom.textColor }}>Pré-visualização:</p>
                <div className="flex gap-2">
                  <div className="rounded-lg px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: custom.primary }}>Botão</div>
                  <div className="rounded-lg px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: custom.cta }}>CTA</div>
                </div>
                <div className="mt-2 rounded-lg border p-2" style={{ backgroundColor: custom.cardColor }}>
                  <p className="text-xs" style={{ color: custom.textColor }}>Card exemplo</p>
                  <div className="h-1.5 w-16 rounded-full mt-1" style={{ backgroundColor: custom.secondary }} />
                </div>
              </div>

              <Button onClick={applyCustom} className="w-full" size="sm">
                Aplicar Personalização
              </Button>
            </div>
          )}
        </div>
      )}

      {!isPremium && canChange && (
        <p className="text-xs text-muted-foreground text-center mt-2 italic">
          🎨 Personalização avançada com color picker disponível no plano PREMIUM
        </p>
      )}
    </div>
  );
}
