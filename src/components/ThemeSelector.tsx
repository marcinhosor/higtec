import { THEME_PALETTES, type ThemePalette } from "@/lib/storage";
import { Check, Palette, Lock } from "lucide-react";

type Props = {
  selectedId: string;
  onSelect: (id: string) => void;
  canChange: boolean;
};

export default function ThemeSelector({ selectedId, onSelect, canChange }: Props) {
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

      <div className="grid grid-cols-1 gap-2">
        {THEME_PALETTES.map((p) => {
          const isSelected = selectedId === p.id;
          const isDefault = p.id === 'default';
          const locked = !canChange && !isDefault;

          return (
            <button
              key={p.id}
              onClick={() => !locked && onSelect(p.id)}
              disabled={locked}
              className={`relative flex items-center gap-3 rounded-xl border-2 p-3 transition-all text-left ${
                isSelected
                  ? "border-primary shadow-card-hover"
                  : locked
                  ? "border-border opacity-50 cursor-not-allowed"
                  : "border-border hover:border-primary/40 hover:shadow-card"
              }`}
            >
              {/* Color swatches */}
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
    </div>
  );
}
