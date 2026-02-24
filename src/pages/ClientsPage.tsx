import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { db, Client, BRAZILIAN_STATES, generateId } from "@/lib/storage";
import { Plus, Phone, MapPin, MessageCircle, Trash2, Edit, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const defaultClient: Omit<Client, "id" | "createdAt" | "serviceHistory"> = {
  name: "", phone: "", address: "", street: "", number: "", complement: "",
  neighborhood: "", city: "", state: "", propertyType: "", observations: "",
};

function buildFullAddress(c: Omit<Client, "id" | "createdAt" | "serviceHistory">) {
  const parts = [c.street, c.number, c.complement, c.neighborhood, c.city, c.state].filter(Boolean);
  return parts.join(", ");
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(defaultClient);

  // Autocomplete data
  const existingNeighborhoods = [...new Set(clients.map(c => c.neighborhood).filter(Boolean))];
  const existingCities = [...new Set(clients.map(c => c.city).filter(Boolean))];

  useEffect(() => { setClients(db.getClients()); }, []);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  const save = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const fullAddress = buildFullAddress(form);
    let updated: Client[];
    if (editing) {
      updated = clients.map(c => c.id === editing.id ? { ...c, ...form, address: fullAddress } : c);
    } else {
      const newClient: Client = { ...form, address: fullAddress, id: generateId(), createdAt: new Date().toISOString(), serviceHistory: [] };
      updated = [...clients, newClient];
    }
    db.saveClients(updated);
    setClients(updated);
    setForm(defaultClient);
    setEditing(null);
    setOpen(false);
    toast.success(editing ? "Cliente atualizado!" : "Cliente adicionado!");
  };

  const remove = (id: string) => {
    const updated = clients.filter(c => c.id !== id);
    db.saveClients(updated);
    setClients(updated);
    toast.success("Cliente removido");
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      name: c.name, phone: c.phone, address: c.address,
      street: c.street || '', number: c.number || '', complement: c.complement || '',
      neighborhood: c.neighborhood || '', city: c.city || '', state: c.state || '',
      propertyType: c.propertyType, observations: c.observations,
    });
    setOpen(true);
  };

  const openWhatsApp = (phone: string) => {
    const num = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${num}`, "_blank");
  };

  const openMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank");
  };

  return (
    <PageShell
      title="Clientes"
      showBack
      action={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(defaultClient); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1">
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              
              {/* Structured Address */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">📍 Endereço</p>
                <div><Label className="text-xs">Rua</Label><Input value={form.street} onChange={e => setForm({...form, street: e.target.value})} placeholder="Nome da rua" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Número</Label><Input value={form.number} onChange={e => setForm({...form, number: e.target.value})} placeholder="Nº" /></div>
                  <div><Label className="text-xs">Complemento</Label><Input value={form.complement} onChange={e => setForm({...form, complement: e.target.value})} placeholder="Apto, Bloco..." /></div>
                </div>
                <div>
                  <Label className="text-xs">Bairro</Label>
                  <Input value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} placeholder="Bairro" list="neighborhoods-list" />
                  <datalist id="neighborhoods-list">
                    {existingNeighborhoods.map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Cidade</Label>
                    <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Cidade" list="cities-list" />
                    <datalist id="cities-list">
                      {existingCities.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <Label className="text-xs">Estado</Label>
                    <Select value={form.state} onValueChange={v => setForm({...form, state: v})}>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div><Label>Tipo de Imóvel</Label><Input value={form.propertyType} onChange={e => setForm({...form, propertyType: e.target.value})} placeholder="Residencial, Comercial..." /></div>
              <div><Label>Observações</Label><Textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} /></div>
              <Button onClick={save} className="w-full rounded-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, bairro, cidade..." className="pl-9 rounded-full" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>Nenhum cliente cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="rounded-xl bg-card p-4 shadow-card animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{c.name}</h3>
                  {c.phone && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" /> {c.phone}</p>}
                  {(c.street || c.address) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {c.street ? `${c.street}, ${c.number}${c.neighborhood ? ` - ${c.neighborhood}` : ''}${c.city ? `, ${c.city}` : ''}${c.state ? `/${c.state}` : ''}` : c.address}
                    </p>
                  )}
                  {c.propertyType && <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{c.propertyType}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => remove(c.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {c.phone && <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openWhatsApp(c.phone)}><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button>}
                {(c.address || c.street) && <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openMaps(c.address || buildFullAddress(c))}><MapPin className="h-3.5 w-3.5" /> Rota</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function Users(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
