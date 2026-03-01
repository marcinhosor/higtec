import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyPlan } from "@/hooks/use-company-plan";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calculator, Package, Lock, Droplets } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type ProductRow = {
  id: string;
  name: string;
  current_stock_ml: number | null;
};

export default function CalculatorPage() {
  const { user } = useAuth();
  const [dilutionPart, setDilutionPart] = useState("");
  const [waterPart, setWaterPart] = useState("");
  const [volume, setVolume] = useState("");
  const [result, setResult] = useState<{ product: number; water: number } | null>(null);
  const { isPro } = useCompanyPlan();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_user_company_id", { _user_id: user.id }).then(({ data }) => {
      if (data) {
        setCompanyId(data);
        supabase.from("products").select("id, name, current_stock_ml").eq("company_id", data).order("name").then(({ data: prods }) => {
          setProducts(prods || []);
        });
      }
    });
  }, [user]);

  const calculate = () => {
    const pPart = parseFloat(dilutionPart);
    const wPart = parseFloat(waterPart);
    const vol = parseFloat(volume);
    if (!isNaN(pPart) && !isNaN(wPart) && !isNaN(vol) && pPart > 0 && wPart > 0 && vol > 0) {
      const totalParts = pPart + wPart;
      const productMl = Math.round((pPart / totalParts) * vol * 1000 * 100) / 100;
      const waterMl = Math.round((wPart / totalParts) * vol * 1000 * 100) / 100;
      setResult({ product: productMl, water: waterMl });
    } else {
      setResult(null);
    }
  };

  const handleDeductStock = async () => {
    if (!result || !selectedProductId || !companyId) {
      toast.error("Selecione um produto e calcule a diluição primeiro");
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const newStock = (product.current_stock_ml || 0) - result.product;
    const { error } = await supabase.from("products").update({
      current_stock_ml: Math.max(0, newStock),
    }).eq("id", selectedProductId);

    if (error) {
      toast.error("Erro ao atualizar estoque");
      return;
    }
    toast.success(`Baixa de ${result.product}ml registrada no estoque!`);
    // Refresh products
    const { data: prods } = await supabase.from("products").select("id, name, current_stock_ml").eq("company_id", companyId).order("name");
    setProducts(prods || []);
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

          <div className="space-y-5">
            {isPro && products.length > 0 && (
              <div>
                <Label>Produto (opcional)</Label>
                <Select onValueChange={setSelectedProductId} value={selectedProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecione para baixa automática" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.current_stock_ml != null ? `(${(p.current_stock_ml / 1000).toFixed(2)}L)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct?.current_stock_ml != null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Estoque atual: <span className="font-medium text-primary">{(selectedProduct.current_stock_ml / 1000).toFixed(2)}L</span>
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              {/* Produto */}
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Package className="h-3.5 w-3.5" />
                  Produto
                </div>
                <Input
                  value={dilutionPart}
                  onChange={e => setDilutionPart(e.target.value)}
                  placeholder="1"
                  className="text-center text-2xl font-bold h-12"
                  type="number"
                  min="1"
                />
                <p className="text-[10px] text-muted-foreground">parte(s)</p>
              </div>

              <span className="text-2xl font-bold text-muted-foreground pb-6">:</span>

              {/* Água */}
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Droplets className="h-3.5 w-3.5" />
                  Água
                </div>
                <Input
                  value={waterPart}
                  onChange={e => setWaterPart(e.target.value)}
                  placeholder="10"
                  className="text-center text-2xl font-bold h-12"
                  type="number"
                  min="1"
                />
                <p className="text-[10px] text-muted-foreground">parte(s)</p>
              </div>
            </div>

            <div>
              <Label>Volume total de calda (litros)</Label>
              <Input type="number" value={volume} onChange={e => setVolume(e.target.value)} placeholder="Ex: 5" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Quantos litros de solução você quer preparar?</p>
            </div>

            <Button onClick={calculate} className="w-full rounded-full">Calcular</Button>
          </div>
        </div>

        {result !== null && (
          <div className="rounded-xl gradient-primary p-6 shadow-card animate-scale-in space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
              <div>
                <p className="text-xs text-primary-foreground/70 font-medium uppercase tracking-wide">Produto</p>
                <p className="text-3xl font-extrabold text-primary-foreground mt-1">{result.product} ml</p>
              </div>
              <span className="text-xl font-bold text-primary-foreground/50">+</span>
              <div>
                <p className="text-xs text-primary-foreground/70 font-medium uppercase tracking-wide">Água</p>
                <p className="text-3xl font-extrabold text-primary-foreground mt-1">{result.water} ml</p>
              </div>
            </div>
            <p className="text-xs text-primary-foreground/70 text-center">
              Proporção {dilutionPart}:{waterPart} — Total: {volume}L de calda
            </p>
          </div>
        )}

        {result !== null && isPro && selectedProductId && (
          <div className="rounded-xl bg-card p-4 shadow-card animate-fade-in">
            <Button onClick={handleDeductStock} className="w-full rounded-full gap-2" variant="outline">
              <Package className="h-4 w-4" /> Dar Baixa no Estoque ({result.product}ml)
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
