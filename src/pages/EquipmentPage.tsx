import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { useCompanyPlan } from "@/hooks/use-company-plan";

const statusOptions = [
  { value: "operacional", label: "Operacional", icon: CheckCircle2, color: "text-green-600" },
  { value: "em_manutencao", label: "Em Manutenção", icon: PauseCircle, color: "text-yellow-600" },
  { value: "inativo", label: "Inativo", icon: XCircle, color: "text-muted-foreground" },
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getMaintenanceUrgency(nextDate: string | null): { label: string; class: string } | null {
  if (!nextDate) return null;
  const now = new Date();
  const next = new Date(nextDate);
  const diffDays = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d atrasada`, class: "bg-destructive text-destructive-foreground" };
  if (diffDays <= 7) return { label: `${diffDays}d restantes`, class: "bg-yellow-500 text-white" };
  if (diffDays <= 30) return { label: `${diffDays}d`, class: "bg-blue-500 text-white" };
  return null;
}

type EquipmentRow = {
  id: string;
  company_id: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  status: string | null;
  next_maintenance_date: string | null;
  maintenance_cost: number | null;
  observations: string | null;
};

export default function EquipmentPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { planTier, isTrialActive } = useCompanyPlan();
  const isPremium = planTier === "premium" || planTier === "pro" || isTrialActive;
  const { showModal, setShowModal } = useProGate();
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentRow | null>(null);

  const emptyForm = {
    name: "", model: "", serialNumber: "", purchaseDate: "", purchaseCost: "",
    status: "operacional", nextMaintenance: "", maintenanceCost: "", observations: "",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_user_company_id", { _user_id: user.id }).then(({ data }) => {
      if (data) setCompanyId(data);
    });
  }, [user]);

  const reload = useCallback(async (cId: string) => {
    const { data } = await supabase.from("equipment").select("*").eq("company_id", cId).order("name");
    setEquipment(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (companyId) reload(companyId);
  }, [companyId, reload]);

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

  const openEdit = (eq: EquipmentRow) => {
    setEditing(eq);
    setForm({
      name: eq.name, model: eq.model || "", serialNumber: eq.serial_number || "",
      purchaseDate: eq.purchase_date || "", purchaseCost: eq.purchase_cost != null ? String(eq.purchase_cost) : "",
      status: eq.status || "operacional", nextMaintenance: eq.next_maintenance_date || "",
      maintenanceCost: eq.maintenance_cost != null ? String(eq.maintenance_cost) : "",
      observations: eq.observations || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !companyId) { toast.error("Nome é obrigatório"); return; }

    const record: any = {
      name: form.name,
      model: form.model || null,
      serial_number: form.serialNumber || null,
      purchase_date: form.purchaseDate || null,
      purchase_cost: form.purchaseCost ? parseFloat(form.purchaseCost) : null,
      status: form.status,
      next_maintenance_date: form.nextMaintenance || null,
      maintenance_cost: form.maintenanceCost ? parseFloat(form.maintenanceCost) : null,
      observations: form.observations || null,
    };

    if (editing) {
      const { error } = await supabase.from("equipment").update(record).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Equipamento atualizado!");
    } else {
      record.company_id = companyId;
      const { error } = await supabase.from("equipment").insert(record);
      if (error) { toast.error("Erro ao cadastrar"); return; }
      toast.success("Equipamento cadastrado!");
    }
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    reload(companyId);
  };

  const remove = async (id: string) => {
    await supabase.from("equipment").delete().eq("id", id);
    if (companyId) reload(companyId);
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
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Próxima Manutenção</Label><Input type="date" value={form.nextMaintenance} onChange={e => setForm({ ...form, nextMaintenance: e.target.value })} /></div>
              <div><Label>Custo de Manutenção (R$)</Label><Input type="number" step="0.01" min="0" value={form.maintenanceCost} onChange={e => setForm({ ...form, maintenanceCost: e.target.value })} /></div>
              <div><Label>Observações</Label><Textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} rows={3} /></div>
              <Button onClick={save} className="w-full rounded-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : equipment.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wrench className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>Nenhum equipamento cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {equipment.map(eq => {
            const st = statusOptions.find(s => s.value === eq.status) || statusOptions[0];
            const urgency = getMaintenanceUrgency(eq.next_maintenance_date);
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
                    {eq.serial_number && <p className="text-xs text-muted-foreground">S/N: {eq.serial_number}</p>}

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
                      {eq.purchase_date && <div>Compra: {new Date(eq.purchase_date).toLocaleDateString("pt-BR")}</div>}
                      {eq.purchase_cost != null && <div>Custo: {formatCurrency(eq.purchase_cost)}</div>}
                      {eq.next_maintenance_date && <div>Próxima: {new Date(eq.next_maintenance_date).toLocaleDateString("pt-BR")}</div>}
                      {eq.maintenance_cost != null && <div>Custo man.: {formatCurrency(eq.maintenance_cost)}</div>}
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
