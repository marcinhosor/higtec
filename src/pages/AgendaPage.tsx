import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { BRAZILIAN_STATES } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyPlan } from "@/hooks/use-company-plan";
import { Plus, Check, Clock, MapPin, Trash2, Edit, User, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AppointmentRow {
  id: string;
  company_id: string;
  client_id: string;
  client_name: string;
  date: string;
  time: string;
  service: string | null;
  status: string | null;
  notes: string | null;
  collaborator_id: string | null;
  collaborator_name: string | null;
}

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
  observations: string | null;
  property_type: string | null;
  service_history: any;
}

interface CollaboratorRow {
  id: string;
  name: string;
  role: string | null;
  status: string | null;
}

export default function AgendaPage() {
  const navigate = useNavigate();
  const { companyId } = useCompanyPlan();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<AppointmentRow | null>(null);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editClientData, setEditClientData] = useState<ClientRow | null>(null);
  const [form, setForm] = useState({ clientId: "", clientName: "", date: "", time: "", serviceType: "", observations: "", technicianId: "", technicianName: "" });

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [apptRes, clientRes, collabRes] = await Promise.all([
        supabase.from("appointments").select("*").eq("company_id", companyId).order("date", { ascending: true }),
        supabase.from("clients").select("*").eq("company_id", companyId).order("name"),
        supabase.from("collaborators").select("*").eq("company_id", companyId).eq("status", "ativo").order("name"),
      ]);
      if (apptRes.data) setAppointments(apptRes.data);
      if (clientRes.data) setClients(clientRes.data);
      if (collabRes.data) setCollaborators(collabRes.data);
    } catch (err) {
      console.error("Error loading agenda data:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setForm({ clientId: "", clientName: "", date: "", time: "", serviceType: "", observations: "", technicianId: "", technicianName: "" });
    setEditingAppt(null);
  };

  const getBusyTimes = (date: string, excludeId?: string) => {
    return appointments
      .filter(a => a.date === date && a.status === "pending" && a.id !== excludeId)
      .map(a => a.time)
      .filter(Boolean);
  };

  const save = async () => {
    if (!form.clientName.trim() || !form.date) { toast.error("Preencha cliente e data"); return; }
    if (!companyId) { toast.error("Empresa não encontrada"); return; }

    const payload = {
      company_id: companyId,
      client_id: form.clientId || "manual",
      client_name: form.clientName,
      date: form.date,
      time: form.time,
      service: form.serviceType,
      notes: form.observations,
      collaborator_id: form.technicianId || null,
      collaborator_name: form.technicianName || null,
    };

    if (editingAppt) {
      const { error } = await supabase.from("appointments").update(payload).eq("id", editingAppt.id);
      if (error) { toast.error("Erro ao atualizar"); console.error(error); return; }
      toast.success("Agendamento atualizado!");
    } else {
      const { error } = await supabase.from("appointments").insert({ ...payload, status: "pending" });
      if (error) { toast.error("Erro ao criar"); console.error(error); return; }
      toast.success("Agendamento criado!");
    }

    setOpen(false);
    resetForm();
    loadData();
  };

  const openEditAppt = (a: AppointmentRow) => {
    setEditingAppt(a);
    setForm({
      clientId: a.client_id, clientName: a.client_name, date: a.date, time: a.time,
      serviceType: a.service || "", observations: a.notes || "",
      technicianId: a.collaborator_id || "", technicianName: a.collaborator_name || "",
    });
    setOpen(true);
  };

  const toggleStatus = async (id: string) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    const newStatus = appt.status === "pending" ? "completed" : "pending";
    const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    loadData();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Agendamento removido");
    loadData();
  };

  const openRoute = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client?.address || client?.street) {
      const addr = client.address || [client.street, client.number, client.neighborhood, client.city, client.state].filter(Boolean).join(", ");
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, "_blank");
    } else {
      toast.error("Cliente sem endereço cadastrado");
    }
  };

  const openEditClient = (clientId: string) => {
    const cl = clients.find(c => c.id === clientId);
    if (cl) {
      setEditClientData({ ...cl });
      setEditClientOpen(true);
    }
  };

  const saveClientEdit = async () => {
    if (!editClientData) return;
    const fullAddr = [editClientData.street, editClientData.number, editClientData.complement, editClientData.neighborhood, editClientData.city, editClientData.state].filter(Boolean).join(", ");
    
    const { error: clientError } = await supabase.from("clients").update({
      name: editClientData.name,
      phone: editClientData.phone,
      street: editClientData.street,
      number: editClientData.number,
      complement: editClientData.complement,
      neighborhood: editClientData.neighborhood,
      city: editClientData.city,
      state: editClientData.state,
      observations: editClientData.observations,
      address: fullAddr,
    }).eq("id", editClientData.id);

    if (clientError) { toast.error("Erro ao salvar cliente"); return; }

    // Update appointment client names
    await supabase.from("appointments").update({ client_name: editClientData.name }).eq("client_id", editClientData.id).eq("company_id", editClientData.company_id);

    setEditClientOpen(false);
    toast.success("Cliente atualizado!");
    loadData();
  };

  const busyTimesForDate = form.date ? getBusyTimes(form.date, editingAppt?.id) : [];

  const sorted = [...appointments].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <PageShell
      title="Agenda"
      showBack
      action={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingAppt ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Cliente</Label>
                <Select value={form.clientId} onValueChange={v => {
                  const cl = clients.find(c => c.id === v);
                  setForm({ ...form, clientId: v, clientName: cl?.name || "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {clients.length === 0 && <p className="text-xs text-muted-foreground mt-1">Cadastre clientes primeiro</p>}
              </div>
              {clients.length === 0 && (
                <div><Label>Nome do cliente</Label><Input value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} /></div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Data</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div><Label>Horário</Label><Input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} /></div>
              </div>

              {form.date && busyTimesForDate.length > 0 && (
                <div className="rounded-lg bg-warning/10 border border-warning/20 p-2.5 text-xs">
                  <p className="font-medium text-warning mb-1">⚠️ Horários ocupados neste dia:</p>
                  <div className="flex flex-wrap gap-1">
                    {busyTimesForDate.map((t, i) => (
                      <span key={i} className="rounded-full bg-warning/20 px-2 py-0.5 text-warning font-medium">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              <div><Label>Tipo de Serviço</Label><Input value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value})} placeholder="Higienização de sofá, carro..." /></div>
              
              {collaborators.length > 0 && (
                <div>
                  <Label>Técnico Responsável</Label>
                  <Select value={form.technicianId} onValueChange={v => {
                    const col = collaborators.find(c => c.id === v);
                    setForm({ ...form, technicianId: v, technicianName: col?.name || "" });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                    <SelectContent>
                      {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.role}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div><Label>Observações</Label><Textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} /></div>
              <Button onClick={save} className="w-full rounded-full">{editingAppt ? "Atualizar" : "Salvar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>Nenhum agendamento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(a => (
            <div key={a.id} className={`rounded-xl bg-card p-4 shadow-card animate-fade-in border-l-4 ${a.status === "completed" ? "border-l-success" : "border-l-primary"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{a.client_name}</h3>
                  <p className="text-sm text-muted-foreground">{new Date(a.date + "T00:00").toLocaleDateString("pt-BR")} {a.time && `às ${a.time}`}</p>
                  {a.service && <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{a.service}</span>}
                  {a.collaborator_name && <p className="text-xs text-muted-foreground mt-1">👷 {a.collaborator_name}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditAppt(a)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleStatus(a.id)} className={`rounded-lg p-2 ${a.status === "completed" ? "text-success" : "text-muted-foreground"} hover:bg-accent`}>
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(a.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full gap-1 text-xs" onClick={() => navigate(`/execucao?appt=${a.id}`)}>
                  <Play className="h-3.5 w-3.5" /> {a.status === "completed" ? "Ver Execução" : "Iniciar Serviço"}
                </Button>
                <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openRoute(a.client_id)}><MapPin className="h-3.5 w-3.5" /> Rota</Button>
                {a.client_id && a.client_id !== "manual" && (
                  <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openEditClient(a.client_id)}>
                    <User className="h-3.5 w-3.5" /> Editar Cliente
                  </Button>
                )}
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${a.status === "completed" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                  {a.status === "completed" ? "Concluído" : "Agendado"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Client Dialog */}
      <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
        <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader>
          {editClientData && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editClientData.name} onChange={e => setEditClientData({...editClientData, name: e.target.value})} /></div>
              <div><Label>Telefone</Label><Input value={editClientData.phone || ""} onChange={e => setEditClientData({...editClientData, phone: e.target.value})} /></div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">📍 Endereço</p>
                <div><Label className="text-xs">Rua</Label><Input value={editClientData.street || ''} onChange={e => setEditClientData({...editClientData, street: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Número</Label><Input value={editClientData.number || ''} onChange={e => setEditClientData({...editClientData, number: e.target.value})} /></div>
                  <div><Label className="text-xs">Complemento</Label><Input value={editClientData.complement || ''} onChange={e => setEditClientData({...editClientData, complement: e.target.value})} /></div>
                </div>
                <div><Label className="text-xs">Bairro</Label><Input value={editClientData.neighborhood || ''} onChange={e => setEditClientData({...editClientData, neighborhood: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Cidade</Label><Input value={editClientData.city || ''} onChange={e => setEditClientData({...editClientData, city: e.target.value})} /></div>
                  <div>
                    <Label className="text-xs">Estado</Label>
                    <Select value={editClientData.state || ''} onValueChange={v => setEditClientData({...editClientData, state: v})}>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div><Label>Observações</Label><Textarea value={editClientData.observations || ""} onChange={e => setEditClientData({...editClientData, observations: e.target.value})} /></div>
              <Button onClick={saveClientEdit} className="w-full rounded-full">Salvar Cliente</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
