import { useState, useEffect, useMemo, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { useCompanyPlan } from "@/hooks/use-company-plan";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { getPhSuggestion } from "@/lib/storage";

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

type ProductRow = {
  id: string;
  company_id: string;
  name: string;
  manufacturer: string | null;
  type: string | null;
  ph: number | null;
  dilution: string | null;
  cost_per_liter: number | null;
  current_stock_ml: number | null;
  min_stock_ml: number | null;
  stock_status: string | null;
  consumption_history: any;
  last_restock_date: string | null;
  created_at: string;
};

type ManufacturerRow = {
  id: string;
  company_id: string;
  name: string;
};

function calcStockStatus(current: number | null, min: number | null): string {
  if (current == null || min == null || min <= 0) return "ok";
  if (current <= min) return "critico";
  if (current <= min * 2) return "baixo";
  return "ok";
}

function StockBadge({ status }: { status: string }) {
  if (status === "ok") return null;
  const isCritical = status === "critico";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isCritical ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
      <AlertTriangle className="h-3 w-3" />
      {isCritical ? "Crítico" : "Baixo"}
    </span>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [manufacturers, setManufacturers] = useState<ManufacturerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState<string | null>(null);
  const [restockForm, setRestockForm] = useState({ volume: "", price: "" });
  const { isPro } = useCompanyPlan();
  const [mfgOpen, setMfgOpen] = useState(false);
  const [mfgSearch, setMfgSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);

  const emptyForm = { name: "", manufacturer: "", type: "", ph: "", costPerLiter: "", currentStockMl: "", minStockMl: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_user_company_id", { _user_id: user.id }).then(({ data }) => {
      if (data) setCompanyId(data);
    });
  }, [user]);

  const reload = useCallback(async (cId: string) => {
    const [{ data: prods }, { data: mfgs }] = await Promise.all([
      supabase.from("products").select("*").eq("company_id", cId).order("name"),
      supabase.from("manufacturers").select("*").eq("company_id", cId).order("name"),
    ]);
    setProducts(prods || []);
    setManufacturers(mfgs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (companyId) reload(companyId);
  }, [companyId, reload]);

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

  const addNewManufacturer = async () => {
    const name = mfgSearch.trim();
    if (!name || !companyId) return;
    await supabase.from("manufacturers").insert({ name, company_id: companyId });
    reload(companyId);
    selectManufacturer(name);
    toast.success(`Fabricante "${name}" adicionado!`);
  };

  const openEditProduct = (p: ProductRow) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      manufacturer: p.manufacturer || "",
      type: p.type || "",
      ph: p.ph != null ? String(p.ph) : "",
      costPerLiter: p.cost_per_liter != null ? String(p.cost_per_liter) : "",
      currentStockMl: p.current_stock_ml != null ? String(p.current_stock_ml) : "",
      minStockMl: p.min_stock_ml != null ? String(p.min_stock_ml) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !companyId) { toast.error("Nome é obrigatório"); return; }

    // Ensure manufacturer exists
    if (form.manufacturer.trim()) {
      const exists = manufacturers.some(m => m.name.toLowerCase() === form.manufacturer.trim().toLowerCase());
      if (!exists) {
        await supabase.from("manufacturers").insert({ name: form.manufacturer.trim(), company_id: companyId });
      }
    }

    const currentMl = isPro && form.currentStockMl ? parseFloat(form.currentStockMl) : null;
    const minMl = isPro && form.minStockMl ? parseFloat(form.minStockMl) : null;

    const record: any = {
      name: form.name,
      manufacturer: form.manufacturer || null,
      type: form.type || null,
      ph: form.ph ? parseFloat(form.ph) : null,
      cost_per_liter: isPro && form.costPerLiter ? parseFloat(form.costPerLiter) : null,
      current_stock_ml: currentMl,
      min_stock_ml: minMl,
      stock_status: calcStockStatus(currentMl, minMl),
    };

    if (editingProduct) {
      const { error } = await supabase.from("products").update(record).eq("id", editingProduct.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Produto atualizado!");
    } else {
      record.company_id = companyId;
      const { error } = await supabase.from("products").insert(record);
      if (error) { toast.error("Erro ao cadastrar"); return; }
      toast.success("Produto cadastrado!");
    }

    setOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
    reload(companyId);
  };

  const remove = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    if (companyId) reload(companyId);
    toast.success("Produto removido");
  };

  const handleRestock = async () => {
    if (!restockOpen || !companyId) return;
    const vol = parseFloat(restockForm.volume);
    const price = parseFloat(restockForm.price);
    if (!vol || vol <= 0) { toast.error("Informe o volume"); return; }

    const product = products.find(p => p.id === restockOpen);
    if (!product) return;

    const newStockMl = (product.current_stock_ml || 0) + vol * 1000;
    // Recalc cost_per_liter as weighted average
    const oldTotal = (product.cost_per_liter || 0) * ((product.current_stock_ml || 0) / 1000);
    const newTotal = oldTotal + (price || 0);
    const totalLiters = newStockMl / 1000;
    const newCostPerLiter = totalLiters > 0 ? newTotal / totalLiters : product.cost_per_liter;

    await supabase.from("products").update({
      current_stock_ml: newStockMl,
      cost_per_liter: newCostPerLiter,
      stock_status: calcStockStatus(newStockMl, product.min_stock_ml),
      last_restock_date: new Date().toISOString().split("T")[0],
    }).eq("id", restockOpen);

    reload(companyId);
    setRestockOpen(null);
    setRestockForm({ volume: "", price: "" });
    toast.success("Estoque atualizado!");
  };

  const phSuggestion = form.ph ? getPhSuggestion(parseFloat(form.ph)) : "";

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
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
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
                    <Label>Custo por Litro (R$)</Label>
                    <Input type="number" step="0.01" min="0" value={form.costPerLiter} onChange={e => setForm({...form, costPerLiter: e.target.value})} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Estoque Atual (ml)</Label>
                    <Input type="number" step="1" min="0" value={form.currentStockMl} onChange={e => setForm({...form, currentStockMl: e.target.value})} placeholder="Ex: 5000" />
                  </div>
                  <div>
                    <Label>Estoque Mínimo de Alerta (ml)</Label>
                    <Input type="number" step="1" min="0" value={form.minStockMl} onChange={e => setForm({...form, minStockMl: e.target.value})} placeholder="Ex: 500" />
                    <p className="text-xs text-muted-foreground mt-1">Alerta crítico quando atingir este volume</p>
                  </div>
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

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Beaker className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>Nenhum produto cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => {
            const costPerLiter = p.cost_per_liter;
            const currentStatus = calcStockStatus(p.current_stock_ml, p.min_stock_ml);
            const isCritical = currentStatus === "critico";
            const isLow = currentStatus === "baixo";
            const stockPercent = p.current_stock_ml != null && p.min_stock_ml != null && p.min_stock_ml > 0
              ? Math.min(100, Math.round((p.current_stock_ml / (p.min_stock_ml * 4)) * 100))
              : null;

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
                      {p.ph != null && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">pH {p.ph}</span>}
                    </div>
                    {p.ph != null && (
                      <p className="text-xs text-muted-foreground mt-2">{getPhSuggestion(p.ph)}</p>
                    )}

                    {/* PRO stock display */}
                    {isPro && p.current_stock_ml != null && (
                      <div className="mt-3 rounded-lg bg-accent/50 border border-border p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Package className="h-3.5 w-3.5" /> Estoque
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Disponível</span>
                          <span className={`font-bold ${isCritical ? "text-destructive" : isLow ? "text-warning" : "text-primary"}`}>
                            {(p.current_stock_ml / 1000).toFixed(2)}L
                          </span>
                        </div>
                        {stockPercent !== null && (
                          <Progress value={stockPercent} className={`h-2 ${isCritical ? "[&>div]:bg-destructive" : isLow ? "[&>div]:bg-warning" : ""}`} />
                        )}
                        <Button size="sm" variant="outline" className="w-full rounded-full gap-1 text-xs mt-1" onClick={() => { setRestockOpen(p.id); setRestockForm({ volume: "", price: "" }); }}>
                          <PackagePlus className="h-3.5 w-3.5" /> Repor Estoque
                        </Button>
                      </div>
                    )}

                    {/* PRO financial display */}
                    {isPro && costPerLiter != null && costPerLiter > 0 && (
                      <div className="mt-3 rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Custo/litro</span>
                          <span className="font-bold text-primary">{formatCurrency(costPerLiter)}</span>
                        </div>
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
