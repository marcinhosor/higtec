import { useState, useEffect, useMemo } from "react";
import PageShell from "@/components/PageShell";
import { db, Product, Manufacturer, generateId, getPhSuggestion, calculateStockStatus, restockProduct } from "@/lib/storage";
import { Plus, Trash2, FlaskConical, Beaker, Lock, DollarSign, PackagePlus, AlertTriangle, Package, Check, ChevronsUpDown, Factory, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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

function StockBadge({ status }: { status: Product["stockStatus"] }) {
  if (status === "normal") return null;
  const isCritical = status === "critico";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isCritical ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
      <AlertTriangle className="h-3 w-3" />
      {isCritical ? "Crítico" : "Baixo"}
    </span>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [open, setOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState<string | null>(null);
  const [restockForm, setRestockForm] = useState({ volume: "", price: "" });
  const [isPro, setIsPro] = useState(() => {
    const t = db.getCompany().planTier;
    return t === 'pro' || t === 'premium';
  });
  const [mfgOpen, setMfgOpen] = useState(false);
  const [mfgSearch, setMfgSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const emptyForm = { name: "", manufacturer: "", purchaseDate: "", type: "", ph: "", pricePaid: "", volumeLiters: "", paymentMethod: "", minAlertVolume: "" };
  const [form, setForm] = useState(emptyForm);

  const reload = () => {
    setProducts(db.getProducts());
    setManufacturers(db.getManufacturers());
    const t = db.getCompany().planTier;
    setIsPro(t === 'pro' || t === 'premium');
  };

  useEffect(() => {
    reload();
    // Seed manufacturers from existing products
    const existingProducts = db.getProducts();
    existingProducts.forEach(p => {
      if (p.manufacturer?.trim()) db.addManufacturer(p.manufacturer.trim());
    });
    setManufacturers(db.getManufacturers());
  }, []);

  const filteredManufacturers = useMemo(() => {
    if (!mfgSearch) return manufacturers;
    const lower = mfgSearch.toLowerCase();
    return manufacturers.filter(m => m.name.toLowerCase().includes(lower));
  }, [manufacturers, mfgSearch]);

  const showAddNew = mfgSearch.trim() && !manufacturers.some(m => m.name.toLowerCase() === mfgSearch.trim().toLowerCase());

  const selectManufacturer = (name: string) => {
    setForm({ ...form, manufacturer: name });
    setMfgOpen(false);
    setMfgSearch("");
  };

  const addNewManufacturer = () => {
    const name = mfgSearch.trim();
    if (!name) return;
    db.addManufacturer(name);
    setManufacturers(db.getManufacturers());
    selectManufacturer(name);
    toast.success(`Fabricante "${name}" adicionado!`);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name, manufacturer: p.manufacturer, purchaseDate: p.purchaseDate, type: p.type,
      ph: p.ph !== null ? String(p.ph) : "", pricePaid: p.pricePaid !== null ? String(p.pricePaid) : "",
      volumeLiters: p.volumeLiters !== null ? String(p.volumeLiters) : "",
      paymentMethod: p.paymentMethod || "", minAlertVolume: p.minAlertVolume !== null ? String(p.minAlertVolume) : "",
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (form.manufacturer.trim()) db.addManufacturer(form.manufacturer.trim());
    const vol = isPro && form.volumeLiters ? parseFloat(form.volumeLiters) : null;

    if (editingProduct) {
      const updated = products.map(p => p.id === editingProduct.id ? {
        ...p,
        name: form.name, manufacturer: form.manufacturer, purchaseDate: form.purchaseDate,
        type: form.type, ph: form.ph ? parseFloat(form.ph) : null,
        pricePaid: isPro && form.pricePaid ? parseFloat(form.pricePaid) : p.pricePaid,
        paymentMethod: isPro ? (form.paymentMethod as Product["paymentMethod"]) : p.paymentMethod,
        volumeLiters: vol ?? p.volumeLiters,
        minAlertVolume: isPro && form.minAlertVolume ? parseFloat(form.minAlertVolume) : p.minAlertVolume,
        stockStatus: calculateStockStatus(p),
      } : p);
      db.saveProducts(updated);
      setProducts(updated);
      setEditingProduct(null);
      setOpen(false);
      setForm(emptyForm);
      setManufacturers(db.getManufacturers());
      toast.success("Produto atualizado!");
      return;
    }

    const product: Product = {
      id: generateId(),
      name: form.name, manufacturer: form.manufacturer, purchaseDate: form.purchaseDate,
      type: form.type, ph: form.ph ? parseFloat(form.ph) : null,
      pricePaid: isPro && form.pricePaid ? parseFloat(form.pricePaid) : null,
      paymentMethod: isPro ? (form.paymentMethod as Product["paymentMethod"]) : "",
      volumeLiters: vol, initialVolume: vol, availableVolume: vol,
      minAlertVolume: isPro && form.minAlertVolume ? parseFloat(form.minAlertVolume) : null,
      stockStatus: "normal", consumptionHistory: [],
      consumptionPerService: null, costPerService: null, profitMargin: null,
    };
    const updated = [...products, product];
    db.saveProducts(updated);
    setProducts(updated);
    setOpen(false);
    setForm(emptyForm);
    setManufacturers(db.getManufacturers());
    toast.success("Produto cadastrado!");
  };

  const remove = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    db.saveProducts(updated);
    setProducts(updated);
    toast.success("Produto removido");
  };

  const handleRestock = () => {
    if (!restockOpen) return;
    const vol = parseFloat(restockForm.volume);
    const price = parseFloat(restockForm.price);
    if (!vol || vol <= 0) { toast.error("Informe o volume"); return; }
    restockProduct(restockOpen, vol, price || 0);
    reload();
    setRestockOpen(null);
    setRestockForm({ volume: "", price: "" });
    toast.success("Estoque atualizado!");
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
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingProduct(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div>
                <Label>Fabricante</Label>
                <Popover open={mfgOpen} onOpenChange={setMfgOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={mfgOpen} className="w-full justify-between font-normal">
                      {form.manufacturer ? (
                        <span className="flex items-center gap-2">
                          <Factory className="h-3.5 w-3.5 text-muted-foreground" />
                          {form.manufacturer}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Selecione ou digite...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Buscar fabricante..." value={mfgSearch} onValueChange={setMfgSearch} />
                      <CommandList>
                        <CommandEmpty className="py-2 px-3 text-sm text-muted-foreground">Nenhum fabricante encontrado</CommandEmpty>
                        <CommandGroup>
                          {filteredManufacturers.map(m => (
                            <CommandItem key={m.id} onSelect={() => selectManufacturer(m.name)} className="cursor-pointer">
                              <Check className={cn("mr-2 h-4 w-4", form.manufacturer === m.name ? "opacity-100" : "opacity-0")} />
                              {m.name}
                            </CommandItem>
                          ))}
                          {showAddNew && (
                            <CommandItem onSelect={addNewManufacturer} className="cursor-pointer text-primary">
                              <Plus className="mr-2 h-4 w-4" />
                              Adicionar "{mfgSearch.trim()}"
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
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
                  <div>
                    <Label>Volume Mínimo de Alerta (litros)</Label>
                    <Input type="number" step="0.1" min="0" value={form.minAlertVolume} onChange={e => setForm({...form, minAlertVolume: e.target.value})} placeholder="Ex: 0.5" />
                    <p className="text-xs text-muted-foreground mt-1">Alerta crítico quando atingir este volume</p>
                  </div>
                  {costPerLiter !== null && costPerLiter > 0 && (
                    <div className="rounded-lg bg-primary/10 p-3 text-sm animate-fade-in">
                      <p className="text-muted-foreground text-xs">Custo por litro:</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(costPerLiter)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t border-border pt-3 space-y-2">
                  <ProBadge />
                  <p className="text-xs text-muted-foreground">Controle automático de estoque disponível na versão PRO</p>
                </div>
              )}

              <Button onClick={save} className="w-full rounded-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Restock Dialog */}
      <Dialog open={!!restockOpen} onOpenChange={v => { if (!v) setRestockOpen(null); }}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle>Repor Estoque</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Volume Adicionado (litros)</Label>
              <Input type="number" step="0.1" min="0" value={restockForm.volume} onChange={e => setRestockForm({...restockForm, volume: e.target.value})} placeholder="Ex: 5" />
            </div>
            <div>
              <Label>Valor Pago (R$)</Label>
              <Input type="number" step="0.01" min="0" value={restockForm.price} onChange={e => setRestockForm({...restockForm, price: e.target.value})} placeholder="0,00" />
            </div>
            <p className="text-xs text-muted-foreground">O custo médio por litro será recalculado automaticamente.</p>
            <Button onClick={handleRestock} className="w-full rounded-full">Confirmar Reposição</Button>
          </div>
        </DialogContent>
      </Dialog>

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
            const stockPercent = p.initialVolume && p.availableVolume != null ? Math.round((p.availableVolume / p.initialVolume) * 100) : null;
            const currentStatus = calculateStockStatus(p);
            const isCritical = currentStatus === "critico";
            const isLow = currentStatus === "baixo";

            return (
              <div key={p.id} className={`rounded-xl bg-card p-4 shadow-card animate-fade-in ${isCritical ? "border-l-4 border-l-destructive" : isLow ? "border-l-4 border-l-warning" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{p.name}</h3>
                      {isPro && <StockBadge status={currentStatus} />}
                    </div>
                    {p.manufacturer && <p className="text-sm text-muted-foreground">{p.manufacturer}</p>}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {p.type && <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{p.type}</span>}
                      {p.ph !== null && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">pH {p.ph}</span>}
                    </div>
                    {p.ph !== null && (
                      <p className="text-xs text-muted-foreground mt-2">{getPhSuggestion(p.ph)}</p>
                    )}

                    {/* PRO stock display */}
                    {isPro && p.availableVolume != null && p.initialVolume != null && (
                      <div className="mt-3 rounded-lg bg-accent/50 border border-border p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Package className="h-3.5 w-3.5" /> Estoque
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Disponível</span>
                          <span className={`font-bold ${isCritical ? "text-destructive" : isLow ? "text-warning" : "text-primary"}`}>
                            {p.availableVolume.toFixed(2)}L / {p.initialVolume.toFixed(2)}L
                          </span>
                        </div>
                        {stockPercent !== null && (
                          <Progress value={stockPercent} className={`h-2 ${isCritical ? "[&>div]:bg-destructive" : isLow ? "[&>div]:bg-warning" : ""}`} />
                        )}
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{stockPercent}% restante</span>
                          {p.consumptionHistory && p.consumptionHistory.length > 0 && (
                            <span>{p.consumptionHistory.length} uso(s)</span>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="w-full rounded-full gap-1 text-xs mt-1" onClick={() => { setRestockOpen(p.id); setRestockForm({ volume: "", price: "" }); }}>
                          <PackagePlus className="h-3.5 w-3.5" /> Repor Estoque
                        </Button>
                      </div>
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
                            <span className="text-muted-foreground">Volume total</span>
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
                  <div className="flex flex-col gap-1 ml-2">
                    <button onClick={() => openEditProduct(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => remove(p.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}