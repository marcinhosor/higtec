import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { db, Product, generateId, getPhSuggestion } from "@/lib/storage";
import { Plus, Trash2, FlaskConical, Beaker } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const productTypes = ["Detergente", "Desengraxante", "Neutralizador", "Impermeabilizante", "Sanitizante", "Solvente", "Outro"];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", manufacturer: "", purchaseDate: "", type: "", ph: "" });

  useEffect(() => { setProducts(db.getProducts()); }, []);

  const save = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const product: Product = {
      id: generateId(),
      name: form.name,
      manufacturer: form.manufacturer,
      purchaseDate: form.purchaseDate,
      type: form.type,
      ph: form.ph ? parseFloat(form.ph) : null,
    };
    const updated = [...products, product];
    db.saveProducts(updated);
    setProducts(updated);
    setOpen(false);
    setForm({ name: "", manufacturer: "", purchaseDate: "", type: "", ph: "" });
    toast.success("Produto cadastrado!");
  };

  const remove = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    db.saveProducts(updated);
    setProducts(updated);
    toast.success("Produto removido");
  };

  const phSuggestion = form.ph ? getPhSuggestion(parseFloat(form.ph)) : "";

  return (
    <PageShell
      title="Produtos"
      showBack
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4">
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
          {products.map(p => (
            <div key={p.id} className="rounded-xl bg-card p-4 shadow-card animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                  {p.manufacturer && <p className="text-sm text-muted-foreground">{p.manufacturer}</p>}
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {p.type && <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{p.type}</span>}
                    {p.ph !== null && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">pH {p.ph}</span>}
                  </div>
                  {p.ph !== null && (
                    <p className="text-xs text-muted-foreground mt-2">{getPhSuggestion(p.ph)}</p>
                  )}
                </div>
                <button onClick={() => remove(p.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
