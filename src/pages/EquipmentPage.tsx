import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { db, Equipment, generateId } from "@/lib/storage";
import { Plus, Wrench, Edit, Trash2, AlertTriangle, CheckCircle2, PauseCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ProUpgradeModal from "@/components/ProUpgradeModal";
import { useProGate } from "@/hooks/use-pro-gate";

const statusOptions = [
  { value: "operacional", label: "Operacional", icon: CheckCircle2, color: "text-green-600" },
  { value: "em_manutencao", label: "Em Manutenção", icon: PauseCircle, color: "text-yellow-600" },
  { value: "inativo", label: "Inativo", icon: XCircle, color: "text-muted-foreground" },
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getMaintenanceUrgency(nextDate: string): { label: string; class: string } | null {
  if (!nextDate) return null;
  const now = new Date();
  const next = new Date(nextDate);
  const diffDays = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d atrasada`, class: "bg-destructive text-destructive-foreground" };
  if (diffDays <= 7) return { label: `${diffDays}d restantes`, class: "bg-yellow-500 text-white" };
  if (diffDays <= 30) return { label: `${diffDays}d`, class: "bg-blue-500 text-white" };
  return null;
}

export default function EquipmentPage() {
  const company = db.getCompany();
  const isPremium = company.planTier === "premium";
  const { showModal, setShowModal, checkPro } = useProGate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);

  const emptyForm = {
    name: "", model: "", serialNumber: "", purchaseDate: "", purchaseCost: "",
    status: "operacional" as Equipment["status"], lastMaintenance: "", nextMaintenance: "",
    maintenanceCost: "", observations: "",
  };
  const [form, setForm] = useState(emptyForm);

  const reload = () => setEquipment(db.getEquipment());
  useEffect(() => { reload(); }, []);

  if (!isPremium) {
    return (
      <PageShell title="Equipamentos" showBack>
        <div className="text-center py-16 space-y-4">
          <Wrench className="mx-auto h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-bold text-foreground">Controle de Equipamentos</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Gerencie manutenções preventivas, custos e status operacional dos seus equipamentos.
          </p>
          <Button onClick={() => setShowModal(true)} className="rounded-full">
            Desbloquear com PREMIUM
          </Button>
        </div>
        <ProUpgradeModal open={showModal} onOpenChange={setShowModal} feature="Controle de Equipamentos" />
      </PageShell>
    );
  }

  const openEdit = (eq: Equipment) => {
    setEditing(eq);
    setForm({
      name: eq.name, model: eq.model, serialNumber: eq.serialNumber,
      purchaseDate: eq.purchaseDate, purchaseCost: eq.purchaseCost != null ? String(eq.purchaseCost) : "",
      status: eq.status, lastMaintenance: eq.lastMaintenance, nextMaintenance: eq.nextMaintenance,
      maintenanceCost: eq.maintenanceCost != null ? String(eq.maintenanceCost) : "",
      observations: eq.observations,
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editing) {
      const updated = equipment.map(eq => eq.id === editing.id ? {
        ...eq, name: form.name, model: form.model, serialNumber: form.serialNumber,
        purchaseDate: form.purchaseDate, purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : null,
        status: form.status, lastMaintenance: form.lastMaintenance, nextMaintenance: form.nextMaintenance,
        maintenanceCost: form.maintenanceCost ? parseFloat(form.maintenanceCost) : null,
        observations: form.observations,
      } : eq);
      db.saveEquipment(updated);
      setEquipment(updated);
      toast.success("Equipamento atualizado!");
    } else {
      const newEq: Equipment = {
        id: generateId(), name: form.name, model: form.model, serialNumber: form.serialNumber,
        purchaseDate: form.purchaseDate, purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : null,
        status: form.status, lastMaintenance: form.lastMaintenance, nextMaintenance: form.nextMaintenance,
        maintenanceCost: form.maintenanceCost ? parseFloat(form.maintenanceCost) : null,
        observations: form.observations, createdAt: new Date().toISOString(),
      };
      const updated = [...equipment, newEq];
      db.saveEquipment(updated);
      setEquipment(updated);
      toast.success("Equipamento cadastrado!");
    }
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const remove = (id: string) => {
    const updated = equipment.filter(eq => eq.id !== id);
    db.saveEquipment(updated);
    setEquipment(updated);
    toast.success("Equipamento removido");
  };

  return (
    <PageShell
      title="Equipamentos"
      showBack
      action={
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Extratora WAP" /></div>
              <div><Label>Modelo</Label><Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></div>
              <div><Label>Número de Série</Label><Input value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div>
              <div><Label>Data de Compra</Label><Input type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} /></div>
              <div><Label>Custo de Aquisição (R$)</Label><Input type="number" step="0.01" min="0" value={form.purchaseCost} onChange={e => setForm({ ...form, purchaseCost: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as Equipment["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Última Manutenção</Label><Input type="date" value={form.lastMaintenance} onChange={e => setForm({ ...form, lastMaintenance: e.target.value })} /></div>
              <div><Label>Próxima Manutenção</Label><Input type="date" value={form.nextMaintenance} onChange={e => setForm({ ...form, nextMaintenance: e.target.value })} /></div>
              <div><Label>Custo de Manutenção (R$)</Label><Input type="number" step="0.01" min="0" value={form.maintenanceCost} onChange={e => setForm({ ...form, maintenanceCost: e.target.value })} /></div>
              <div><Label>Observações</Label><Textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} rows={3} /></div>
              <Button onClick={save} className="w-full rounded-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {equipment.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wrench className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>Nenhum equipamento cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {equipment.map(eq => {
            const st = statusOptions.find(s => s.value === eq.status)!;
            const urgency = getMaintenanceUrgency(eq.nextMaintenance);
            const StatusIcon = st.icon;

            return (
              <div key={eq.id} className={`rounded-xl bg-card p-4 shadow-card animate-fade-in ${urgency && urgency.class.includes('destructive') ? 'border-l-4 border-l-destructive' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{eq.name}</h3>
                      <StatusIcon className={`h-4 w-4 ${st.color}`} />
                    </div>
                    {eq.model && <p className="text-sm text-muted-foreground">{eq.model}</p>}
                    {eq.serialNumber && <p className="text-xs text-muted-foreground">S/N: {eq.serialNumber}</p>}

                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{st.label}</Badge>
                      {urgency && (
                        <Badge className={`text-xs ${urgency.class}`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {urgency.label}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {eq.purchaseDate && <div>Compra: {new Date(eq.purchaseDate).toLocaleDateString("pt-BR")}</div>}
                      {eq.purchaseCost != null && <div>Custo: {formatCurrency(eq.purchaseCost)}</div>}
                      {eq.lastMaintenance && <div>Última man.: {new Date(eq.lastMaintenance).toLocaleDateString("pt-BR")}</div>}
                      {eq.nextMaintenance && <div>Próxima: {new Date(eq.nextMaintenance).toLocaleDateString("pt-BR")}</div>}
                      {eq.maintenanceCost != null && <div>Custo man.: {formatCurrency(eq.maintenanceCost)}</div>}
                    </div>
                    {eq.observations && <p className="text-xs text-muted-foreground mt-2 italic">{eq.observations}</p>}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(eq)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(eq.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
