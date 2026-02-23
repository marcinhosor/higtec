import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { db, Appointment, generateId } from "@/lib/storage";
import { Plus, Check, Clock, MapPin, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients] = useState(() => db.getClients());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ clientId: "", clientName: "", date: "", time: "", serviceType: "", observations: "" });

  useEffect(() => { setAppointments(db.getAppointments()); }, []);

  const save = () => {
    if (!form.clientName.trim() || !form.date) { toast.error("Preencha cliente e data"); return; }
    const appt: Appointment = { ...form, id: generateId(), status: "agendado" };
    const updated = [...appointments, appt];
    db.saveAppointments(updated);
    setAppointments(updated);
    setOpen(false);
    setForm({ clientId: "", clientName: "", date: "", time: "", serviceType: "", observations: "" });
    toast.success("Agendamento criado!");
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
    const client = db.getClients().find(c => c.id === clientId);
    if (client?.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`, "_blank");
    } else {
      toast.error("Cliente sem endereço cadastrado");
    }
  };

  const sorted = [...appointments].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <PageShell
      title="Agenda"
      showBack
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Cliente</Label>
                <Select onValueChange={v => {
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
              <div><Label>Tipo de Serviço</Label><Input value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value})} placeholder="Higienização de sofá, carro..." /></div>
              <div><Label>Observações</Label><Textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} /></div>
              <Button onClick={save} className="w-full rounded-full">Salvar</Button>
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
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleStatus(a.id)} className={`rounded-lg p-2 ${a.status === "concluido" ? "text-success" : "text-muted-foreground"} hover:bg-accent`}>
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(a.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openRoute(a.clientId)}><MapPin className="h-3.5 w-3.5" /> Rota</Button>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${a.status === "concluido" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                  {a.status === "concluido" ? "Concluído" : "Agendado"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
