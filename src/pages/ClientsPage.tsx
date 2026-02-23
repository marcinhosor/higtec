import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { db, Client, generateId } from "@/lib/storage";
import { Plus, Phone, MapPin, MessageCircle, Trash2, Edit, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const defaultClient: Omit<Client, "id" | "createdAt" | "serviceHistory"> = {
  name: "",
  phone: "",
  address: "",
  propertyType: "",
  observations: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(defaultClient);

  useEffect(() => { setClients(db.getClients()); }, []);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const save = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    let updated: Client[];
    if (editing) {
      updated = clients.map(c => c.id === editing.id ? { ...c, ...form } : c);
    } else {
      const newClient: Client = { ...form, id: generateId(), createdAt: new Date().toISOString(), serviceHistory: [] };
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
    setForm({ name: c.name, phone: c.phone, address: c.address, propertyType: c.propertyType, observations: c.observations });
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
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><Label>Endereço</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
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
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." className="pl-9 rounded-full" />
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
                  {c.address && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {c.address}</p>}
                  {c.propertyType && <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{c.propertyType}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => remove(c.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {c.phone && <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openWhatsApp(c.phone)}><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button>}
                {c.address && <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openMaps(c.address)}><MapPin className="h-3.5 w-3.5" /> Rota</Button>}
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
