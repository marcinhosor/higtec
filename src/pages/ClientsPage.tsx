import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { BRAZILIAN_STATES } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Phone, MapPin, MessageCircle, Trash2, Edit, Search, ContactRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ClientRow {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  property_type: string | null;
  observations: string | null;
  service_history: any;
  created_at: string;
}

const defaultForm = {
  name: "", phone: "", street: "", number: "", complement: "",
  neighborhood: "", city: "", state: "", propertyType: "", observations: "",
};

function buildFullAddress(f: typeof defaultForm) {
  return [f.street, f.number, f.complement, f.neighborhood, f.city, f.state].filter(Boolean).join(", ");
}

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);

  const existingNeighborhoods = [...new Set(clients.map(c => c.neighborhood).filter(Boolean))] as string[];
  const existingCities = [...new Set(clients.map(c => c.city).filter(Boolean))] as string[];

  const fetchClients = useCallback(async (cId: string) => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("company_id", cId)
      .order("name");
    if (!error && data) setClients(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_user_company_id", { _user_id: user.id }).then(({ data }) => {
      if (data) {
        setCompanyId(data);
        fetchClients(data);
      }
    });
  }, [user, fetchClients]);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) ||
    (c.neighborhood || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.city || "").toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!companyId) return;
    const fullAddress = buildFullAddress(form);

    if (editing) {
      const { error } = await supabase.from("clients").update({
        name: form.name, phone: form.phone, address: fullAddress,
        street: form.street, number: form.number, complement: form.complement,
        neighborhood: form.neighborhood, city: form.city, state: form.state,
        property_type: form.propertyType, observations: form.observations,
      }).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Cliente atualizado!");
    } else {
      const { error } = await supabase.from("clients").insert({
        company_id: companyId, name: form.name, phone: form.phone, address: fullAddress,
        street: form.street, number: form.number, complement: form.complement,
        neighborhood: form.neighborhood, city: form.city, state: form.state,
        property_type: form.propertyType, observations: form.observations,
      });
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Cliente adicionado!");
    }

    setForm(defaultForm);
    setEditing(null);
    setOpen(false);
    fetchClients(companyId);
  };

  const remove = async (id: string) => {
    if (!companyId) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Cliente removido");
    fetchClients(companyId);
  };

  const openEdit = (c: ClientRow) => {
    setEditing(c);
    setForm({
      name: c.name, phone: c.phone || "", street: c.street || "",
      number: c.number || "", complement: c.complement || "",
      neighborhood: c.neighborhood || "", city: c.city || "", state: c.state || "",
      propertyType: c.property_type || "", observations: c.observations || "",
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

  const getDisplayAddress = (c: ClientRow) => {
    if (c.street) {
      return `${c.street}, ${c.number || ""}${c.neighborhood ? ` - ${c.neighborhood}` : ""}${c.city ? `, ${c.city}` : ""}${c.state ? `/${c.state}` : ""}`;
    }
    return c.address || "";
  };

  return (
    <PageShell
      title="Clientes"
      showBack
      action={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(defaultForm); } }}>
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
              {/* Import from contacts button */}
              {!editing && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full gap-2"
                  onClick={async () => {
                    if (!("contacts" in navigator && "ContactsManager" in window)) {
                      toast.error("Seu navegador não suporta acesso à agenda. Use o Chrome no celular.");
                      return;
                    }
                    try {
                      const contacts = await (navigator as any).contacts.select(
                        ["name", "tel"],
                        { multiple: false }
                      );
                      if (contacts && contacts.length > 0) {
                        const c = contacts[0];
                        const name = c.name?.[0] || "";
                        const phone = c.tel?.[0] || "";
                        setForm(prev => ({
                          ...prev,
                          name: name || prev.name,
                          phone: phone ? phone.replace(/\D/g, "").replace(/^55/, "") : prev.phone,
                        }));
                        toast.success("Contato importado!");
                      }
                    } catch (err: any) {
                      if (err.name !== "TypeError") {
                        console.error("Contact picker error:", err);
                      }
                    }
                  }}
                >
                  <ContactRound className="h-4 w-4" />
                  Importar da Agenda
                </Button>
              )}

              <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UsersIcon className="mx-auto h-12 w-12 mb-2 opacity-40" />
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
                      <MapPin className="h-3 w-3" /> {getDisplayAddress(c)}
                    </p>
                  )}
                  {c.property_type && <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{c.property_type}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => remove(c.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {c.phone && <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openWhatsApp(c.phone!)}><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button>}
                {(c.address || c.street) && <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openMaps(c.address || buildFullAddress({ ...defaultForm, street: c.street || "", number: c.number || "", complement: c.complement || "", neighborhood: c.neighborhood || "", city: c.city || "", state: c.state || "" }))}><MapPin className="h-3.5 w-3.5" /> Rota</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function UsersIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
