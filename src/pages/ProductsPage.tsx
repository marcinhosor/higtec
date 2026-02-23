import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { db, Product, generateId, getPhSuggestion } from "@/lib/storage";
import { Plus, Trash2, FlaskConical, Beaker, Lock, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const productTypes = ["Detergente", "Desengraxante", "Neutralizador", "Impermeabilizante", "Sanitizante", "Solvente", "Outro"];
const paymentMethods = [
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Cartão Débito" },
  { value: "credito", label: "Cartão Crédito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      <Lock className="h-3.5 w-3.5 text-primary" />
      <span>Disponível na versão <strong className="text-primary">PRO</strong></span>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [form, setForm] = useState({
    name: "", manufacturer: "", purchaseDate: "", type: "", ph: "",
    pricePaid: "", volumeLiters: "", paymentMethod: "",
  });

  useEffect(() => {
    setProducts(db.getProducts());
    setIsPro(db.getCompany().isPro);
  }, []);

  const save = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const product: Product = {
      id: generateId(),
      name: form.name,
      manufacturer: form.manufacturer,
      purchaseDate: form.purchaseDate,
      type: form.type,
      ph: form.ph ? parseFloat(form.ph) : null,
      pricePaid: isPro && form.pricePaid ? parseFloat(form.pricePaid) : null,
      paymentMethod: isPro ? (form.paymentMethod as Product["paymentMethod"]) : "",
      volumeLiters: isPro && form.volumeLiters ? parseFloat(form.volumeLiters) : null,
      consumptionPerService: null,
      costPerService: null,
      profitMargin: null,
    };
    const updated = [...products, product];
    db.saveProducts(updated);
    setProducts(updated);
    setOpen(false);
    setForm({ name: "", manufacturer: "", purchaseDate: "", type: "", ph: "", pricePaid: "", volumeLiters: "", paymentMethod: "" });
    toast.success("Produto cadastrado!");
  };

  const remove = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    db.saveProducts(updated);
    setProducts(updated);
    toast.success("Produto removido");
  };

  const phSuggestion = form.ph ? getPhSuggestion(parseFloat(form.ph)) : "";
  const costPerLiter = form.pricePaid && form.volumeLiters
    ? parseFloat(form.pricePaid) / parseFloat(form.volumeLiters)
    : null;

  return (
    <PageShell
      title="Produtos"
      showBack
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Produto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Fabricante</Label><Input value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})} /></div>
              <div><Label>Data da Compra</Label><Input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} /></div>
              <div>
                <Label>Tipo</Label>
                <Select onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    {productTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>pH</Label>
                <Input type="number" step="0.1" min="0" max="14" value={form.ph} onChange={e => setForm({...form, ph: e.target.value})} placeholder="0 a 14" />
                {phSuggestion && (
                  <div className="mt-2 rounded-lg bg-accent p-3 text-xs text-accent-foreground animate-fade-in">
                    <FlaskConical className="inline h-3.5 w-3.5 mr-1" />
                    {phSuggestion}
                  </div>
                )}
              </div>

              {/* PRO financial fields */}
              {isPro ? (
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
                    <DollarSign className="h-3.5 w-3.5" /> Controle Financeiro PRO
                  </div>
                  <div>
                    <Label>Valor Pago (R$)</Label>
                    <Input type="number" step="0.01" min="0" value={form.pricePaid} onChange={e => setForm({...form, pricePaid: e.target.value})} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Forma de Pagamento</Label>
                    <Select onValueChange={v => setForm({...form, paymentMethod: v})}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Volume Total (litros)</Label>
                    <Input type="number" step="0.1" min="0" value={form.volumeLiters} onChange={e => setForm({...form, volumeLiters: e.target.value})} placeholder="Ex: 5" />
                  </div>
                  {costPerLiter !== null && costPerLiter > 0 && (
                    <div className="rounded-lg bg-primary/10 p-3 text-sm animate-fade-in">
                      <p className="text-muted-foreground text-xs">Custo por litro:</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(costPerLiter)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t border-border pt-3">
                  <ProBadge />
                </div>
              )}

              <Button onClick={save} className="w-full rounded-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Beaker className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>Nenhum produto cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => {
            const pCostPerLiter = p.pricePaid && p.volumeLiters ? p.pricePaid / p.volumeLiters : null;
            const pmLabel = paymentMethods.find(m => m.value === p.paymentMethod)?.label;
            return (
              <div key={p.id} className="rounded-xl bg-card p-4 shadow-card animate-fade-in">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                    {p.manufacturer && <p className="text-sm text-muted-foreground">{p.manufacturer}</p>}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {p.type && <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{p.type}</span>}
                      {p.ph !== null && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">pH {p.ph}</span>}
                    </div>
                    {p.ph !== null && (
                      <p className="text-xs text-muted-foreground mt-2">{getPhSuggestion(p.ph)}</p>
                    )}

                    {/* PRO financial display */}
                    {isPro && (p.pricePaid || p.volumeLiters) && (
                      <div className="mt-3 rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-1">
                        {p.pricePaid !== null && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Valor pago</span>
                            <span className="font-medium text-foreground">{formatCurrency(p.pricePaid)}</span>
                          </div>
                        )}
                        {pmLabel && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Pagamento</span>
                            <span className="text-foreground">{pmLabel}</span>
                          </div>
                        )}
                        {p.volumeLiters !== null && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Volume</span>
                            <span className="text-foreground">{p.volumeLiters}L</span>
                          </div>
                        )}
                        {pCostPerLiter !== null && (
                          <div className="flex justify-between text-sm border-t border-primary/10 pt-1 mt-1">
                            <span className="text-muted-foreground font-medium">Custo/litro</span>
                            <span className="font-bold text-primary">{formatCurrency(pCostPerLiter)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => remove(p.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10 ml-2"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
