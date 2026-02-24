import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { db, Appointment, Client, Collaborator, BRAZILIAN_STATES, generateId } from "@/lib/storage";
import { Plus, Check, Clock, MapPin, Trash2, Edit, User, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AgendaPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [open, setOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editClientData, setEditClientData] = useState<Client | null>(null);
  const [form, setForm] = useState({ clientId: "", clientName: "", date: "", time: "", serviceType: "", observations: "", technicianId: "", technicianName: "" });

  useEffect(() => {
    setAppointments(db.getAppointments());
    setClients(db.getClients());
    setCollaborators(db.getCollaborators().filter(c => c.status === 'ativo'));
  }, []);

  const resetForm = () => {
    setForm({ clientId: "", clientName: "", date: "", time: "", serviceType: "", observations: "", technicianId: "", technicianName: "" });
    setEditingAppt(null);
  };

  // Get busy times for a given date
  const getBusyTimes = (date: string, excludeId?: string) => {
    return appointments
      .filter(a => a.date === date && a.status === 'agendado' && a.id !== excludeId)
      .map(a => a.time)
      .filter(Boolean);
  };

  const save = () => {
    if (!form.clientName.trim() || !form.date) { toast.error("Preencha cliente e data"); return; }

    if (editingAppt) {
      const updated = appointments.map(a => a.id === editingAppt.id ? { ...a, ...form } : a);
      db.saveAppointments(updated);
      setAppointments(updated);
      toast.success("Agendamento atualizado!");
    } else {
      const appt: Appointment = { ...form, id: generateId(), status: "agendado" };
      const updated = [...appointments, appt];
      db.saveAppointments(updated);
      setAppointments(updated);
      toast.success("Agendamento criado!");
    }

    setOpen(false);
    resetForm();
  };

  const openEditAppt = (a: Appointment) => {
    setEditingAppt(a);
    setForm({
      clientId: a.clientId, clientName: a.clientName, date: a.date, time: a.time,
      serviceType: a.serviceType, observations: a.observations,
      technicianId: a.technicianId || "", technicianName: a.technicianName || "",
    });
    setOpen(true);
  };

  const toggleStatus = (id: string) => {
    const updated = appointments.map(a =>
      a.id === id ? { ...a, status: (a.status === "agendado" ? "concluido" : "agendado") as Appointment["status"] } : a
    );
    db.saveAppointments(updated);
    setAppointments(updated);
  };

  const remove = (id: string) => {
    const updated = appointments.filter(a => a.id !== id);
    db.saveAppointments(updated);
    setAppointments(updated);
    toast.success("Agendamento removido");
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

  // Edit client inline
  const openEditClient = (clientId: string) => {
    const cl = clients.find(c => c.id === clientId);
    if (cl) {
      setEditClientData({ ...cl });
      setEditClientOpen(true);
    }
  };

  const saveClientEdit = () => {
    if (!editClientData) return;
    const fullAddr = [editClientData.street, editClientData.number, editClientData.complement, editClientData.neighborhood, editClientData.city, editClientData.state].filter(Boolean).join(", ");
    const updated = clients.map(c => c.id === editClientData.id ? { ...editClientData, address: fullAddr } : c);
    db.saveClients(updated);
    setClients(updated);
    // Update appointment client names
    const updatedAppts = appointments.map(a => a.clientId === editClientData.id ? { ...a, clientName: editClientData.name } : a);
    db.saveAppointments(updatedAppts);
    setAppointments(updatedAppts);
    setEditClientOpen(false);
    toast.success("Cliente atualizado!");
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

              {/* Busy times indicator */}
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
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>Nenhum agendamento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(a => (
            <div key={a.id} className={`rounded-xl bg-card p-4 shadow-card animate-fade-in border-l-4 ${a.status === "concluido" ? "border-l-success" : "border-l-primary"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{a.clientName}</h3>
                  <p className="text-sm text-muted-foreground">{new Date(a.date + "T00:00").toLocaleDateString("pt-BR")} {a.time && `às ${a.time}`}</p>
                  {a.serviceType && <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{a.serviceType}</span>}
                  {a.technicianName && <p className="text-xs text-muted-foreground mt-1">👷 {a.technicianName}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditAppt(a)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleStatus(a.id)} className={`rounded-lg p-2 ${a.status === "concluido" ? "text-success" : "text-muted-foreground"} hover:bg-accent`}>
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(a.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full gap-1 text-xs" onClick={() => navigate(`/execucao?appt=${a.id}`)}>
                  <Play className="h-3.5 w-3.5" /> {a.status === "concluido" ? "Ver Execução" : "Iniciar Serviço"}
                </Button>
                <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openRoute(a.clientId)}><MapPin className="h-3.5 w-3.5" /> Rota</Button>
                {a.clientId && (
                  <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openEditClient(a.clientId)}>
                    <User className="h-3.5 w-3.5" /> Editar Cliente
                  </Button>
                )}
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${a.status === "concluido" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                  {a.status === "concluido" ? "Concluído" : "Agendado"}
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
              <div><Label>Telefone</Label><Input value={editClientData.phone} onChange={e => setEditClientData({...editClientData, phone: e.target.value})} /></div>
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
              <div><Label>Observações</Label><Textarea value={editClientData.observations} onChange={e => setEditClientData({...editClientData, observations: e.target.value})} /></div>
              <Button onClick={saveClientEdit} className="w-full rounded-full">Salvar Cliente</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
