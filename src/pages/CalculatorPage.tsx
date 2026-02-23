import { useState } from "react";
import PageShell from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

export default function CalculatorPage() {
  const [dilution, setDilution] = useState("");
  const [volume, setVolume] = useState("");
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const parts = dilution.split(":").map(s => parseFloat(s.trim()));
    const vol = parseFloat(volume);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(vol) && parts[1] > 0) {
      const ratio = parts[1] / parts[0];
      const ml = (vol / ratio) * 1000;
      setResult(Math.round(ml * 100) / 100);
    } else {
      setResult(null);
    }
  };

  return (
    <PageShell title="Calculadora de Diluição" showBack>
      <div className="mx-auto max-w-md space-y-6">
        <div className="rounded-xl bg-card p-6 shadow-card animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Calcular Diluição</h2>
              <p className="text-xs text-muted-foreground">Informe os dados do fabricante</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Diluição recomendada</Label>
              <Input
                value={dilution}
                onChange={e => setDilution(e.target.value)}
                placeholder="Ex: 1:10"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Formato: 1:10, 1:20, etc.</p>
            </div>
            <div>
              <Label>Volume de água (litros)</Label>
              <Input
                type="number"
                value={volume}
                onChange={e => setVolume(e.target.value)}
                placeholder="Ex: 5"
                className="mt-1"
              />
            </div>
            <Button onClick={calculate} className="w-full rounded-full">Calcular</Button>
          </div>
        </div>

        {result !== null && (
          <div className="rounded-xl gradient-primary p-6 text-center shadow-card animate-scale-in">
            <p className="text-sm text-primary-foreground/80 font-medium">Quantidade de produto</p>
            <p className="text-4xl font-extrabold text-primary-foreground mt-1">{result} ml</p>
            <p className="text-xs text-primary-foreground/70 mt-2">
              Para {volume}L de água na diluição {dilution}
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
