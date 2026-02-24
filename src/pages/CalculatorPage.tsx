import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { db, Product, deductStock } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calculator, Package, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CalculatorPage() {
  const [dilution, setDilution] = useState("");
  const [volume, setVolume] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");

  useEffect(() => {
    setIsPro(db.getCompany().isPro);
    setProducts(db.getProducts());
  }, []);

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

  const handleDeductStock = () => {
    if (!result || !selectedProductId) {
      toast.error("Selecione um produto e calcule a diluição primeiro");
      return;
    }
    const success = deductStock(selectedProductId, result, `Diluição ${dilution} - ${volume}L de água`);
    if (success) {
      toast.success(`Baixa de ${result}ml registrada no estoque!`);
      setProducts(db.getProducts());
    } else {
      toast.error("Erro ao atualizar estoque");
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

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
            {/* PRO: Product selector */}
            {isPro && products.length > 0 && (
              <div>
                <Label>Produto (opcional)</Label>
                <Select onValueChange={setSelectedProductId} value={selectedProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecione para baixa automática" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.availableVolume != null ? `(${p.availableVolume.toFixed(2)}L)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct?.availableVolume !== null && selectedProduct?.availableVolume !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Estoque atual: <span className="font-medium text-primary">{selectedProduct.availableVolume.toFixed(2)}L</span>
                  </p>
                )}
              </div>
            )}

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

        {/* PRO: Deduct stock button */}
        {result !== null && isPro && selectedProductId && (
          <div className="rounded-xl bg-card p-4 shadow-card animate-fade-in">
            <Button onClick={handleDeductStock} className="w-full rounded-full gap-2" variant="outline">
              <Package className="h-4 w-4" /> Dar Baixa no Estoque ({result}ml)
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">O volume será descontado automaticamente do produto</p>
          </div>
        )}

        {result !== null && !isPro && (
          <div className="rounded-xl bg-card p-4 shadow-card animate-fade-in">
            <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span>Baixa automática de estoque disponível na versão <strong className="text-primary">PRO</strong></span>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}