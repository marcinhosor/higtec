import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyPlan } from "@/hooks/use-company-plan";
import { useAuth } from "@/contexts/AuthContext";
import PageShell from "@/components/PageShell";
import { db, CompanyInfo, PixKey, Collaborator, ServiceType, generateId, THEME_PALETTES } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, Building2, Save, Crown, ImagePlus, CreditCard, Star, Trash2, Plus, Users, UserCheck, UserX, Wrench, ArrowUp, ArrowDown, Pencil, Key, Copy, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import ThemeSelector from "@/components/ThemeSelector";
import { useTheme } from "@/hooks/use-theme";

const pixTypeLabels: Record<PixKey['type'], string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Aleatória',
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { planTier: dbPlanTier, isPro: dbIsPro, isTrialActive, trialDaysRemaining } = useCompanyPlan();
  const { setTheme, refresh: refreshTheme } = useTheme();
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyInfo>(() => {
    const c = db.getCompany();
    return {
      ...c,
      bankData: c.bankData || { bankName: '', agency: '', account: '', accountType: 'corrente' as const, holderName: '', holderDocument: '' },
      pixKeys: c.pixKeys || [],
      planTier: c.planTier || (c.isPro ? 'pro' : 'free'),
      selectedThemeId: c.selectedThemeId || 'default',
    };
  });

  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => db.getCollaborators());
  const [collabOpen, setCollabOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);
  const [collabForm, setCollabForm] = useState({ name: "", role: "", phone: "", cpf: "", admissionDate: "", signature: "" });

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(() => db.getServiceTypes());
  const [editingST, setEditingST] = useState<ServiceType | null>(null);
  const [stForm, setStForm] = useState({ name: "", defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0 });

  // Technician management state
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [techOpen, setTechOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<any | null>(null);
  const [techForm, setTechForm] = useState({ name: "", email: "", phone: "", pin: "" });
  const [accessCode, setAccessCode] = useState("");
  const [loadingTechs, setLoadingTechs] = useState(false);

  // Load technicians and access code from database
  useEffect(() => {
    if (!user) return;
    const loadTechnicians = async () => {
      setLoadingTechs(true);
      // Get company_id from profile
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
      if (!profile?.company_id) { setLoadingTechs(false); return; }

      // Get access code
      const { data: companyData } = await supabase.from("companies").select("access_code").eq("id", profile.company_id).single();
      if (companyData) setAccessCode(companyData.access_code);

      // Get technicians
      const { data: techs } = await supabase.from("technicians").select("*").eq("company_id", profile.company_id).order("created_at");
      if (techs) setTechnicians(techs);
      setLoadingTechs(false);
    };
    loadTechnicians();
  }, [user]);

  const saveTechnician = async () => {
    if (!techForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (techForm.pin.length !== 4) { toast.error("PIN deve ter 4 dígitos"); return; }
    
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user!.id).single();
    if (!profile?.company_id) { toast.error("Empresa não encontrada"); return; }

    if (editingTech) {
      const { error } = await supabase.from("technicians").update({
        name: techForm.name, email: techForm.email || null, phone: techForm.phone || null, pin: techForm.pin,
      }).eq("id", editingTech.id);
      if (error) { toast.error("Erro ao atualizar técnico"); return; }
      setTechnicians(prev => prev.map(t => t.id === editingTech.id ? { ...t, ...techForm } : t));
      toast.success("Técnico atualizado!");
    } else {
      const { data, error } = await supabase.from("technicians").insert({
        company_id: profile.company_id, name: techForm.name, email: techForm.email || null, phone: techForm.phone || null, pin: techForm.pin,
      }).select().single();
      if (error) {
        toast.error(error.message.includes("unique") ? "Já existe um técnico com esse nome" : "Erro ao cadastrar técnico");
        return;
      }
      setTechnicians(prev => [...prev, data]);
      toast.success("Técnico cadastrado!");
    }
    setTechOpen(false);
    setEditingTech(null);
    setTechForm({ name: "", email: "", phone: "", pin: "" });
  };

  const toggleTechStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const { error } = await supabase.from("technicians").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Erro ao alterar status"); return; }
    setTechnicians(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const removeTechnician = async (id: string) => {
    const { error } = await supabase.from("technicians").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover técnico"); return; }
    setTechnicians(prev => prev.filter(t => t.id !== id));
    toast.success("Técnico removido");
  };

  const copyAccessCode = () => {
    navigator.clipboard.writeText(accessCode);
    toast.success("Código copiado!");
  };

  const saveCompany = () => {
    db.saveCompany(company);
    refreshTheme();
    toast.success("Dados salvos!");
  };

  const handleThemeSelect = (themeId: string) => {
    setCompany(prev => ({ ...prev, selectedThemeId: themeId }));
    setTheme(themeId);
    toast.success("Paleta aplicada com sucesso!");
  };




  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCompany({ ...company, logo: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCompany({ ...company, signature: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const handleCollabSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCollabForm({ ...collabForm, signature: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const addPixKey = () => {
    const newKey: PixKey = { id: generateId(), type: 'cpf', value: '', isPrimary: company.pixKeys.length === 0 };
    setCompany({ ...company, pixKeys: [...company.pixKeys, newKey] });
  };

  const updatePixKey = (id: string, updates: Partial<PixKey>) => {
    setCompany({ ...company, pixKeys: company.pixKeys.map(k => k.id === id ? { ...k, ...updates } : k) });
  };

  const removePixKey = (id: string) => {
    const filtered = company.pixKeys.filter(k => k.id !== id);
    if (filtered.length > 0 && !filtered.some(k => k.isPrimary)) filtered[0].isPrimary = true;
    setCompany({ ...company, pixKeys: filtered });
  };

  const setPrimaryPix = (id: string) => {
    setCompany({ ...company, pixKeys: company.pixKeys.map(k => ({ ...k, isPrimary: k.id === id })) });
  };

  const saveCollaborator = () => {
    if (!collabForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editingCollab) {
      const updated = collaborators.map(c => c.id === editingCollab.id ? {
        ...c, name: collabForm.name, role: collabForm.role, phone: collabForm.phone,
        cpf: collabForm.cpf, admissionDate: collabForm.admissionDate, signature: collabForm.signature,
      } : c);
      db.saveCollaborators(updated);
      setCollaborators(updated);
      setCollabOpen(false);
      setEditingCollab(null);
      setCollabForm({ name: "", role: "", phone: "", cpf: "", admissionDate: "", signature: "" });
      toast.success("Colaborador atualizado!");
      return;
    }
    const collab: Collaborator = {
      id: generateId(), name: collabForm.name, role: collabForm.role, phone: collabForm.phone,
      cpf: collabForm.cpf, admissionDate: collabForm.admissionDate, status: 'ativo',
      signature: collabForm.signature, createdAt: new Date().toISOString(),
    };
    const updated = [...collaborators, collab];
    db.saveCollaborators(updated);
    setCollaborators(updated);
    setCollabOpen(false);
    setCollabForm({ name: "", role: "", phone: "", cpf: "", admissionDate: "", signature: "" });
    toast.success("Colaborador cadastrado!");
  };

  const toggleCollabStatus = (id: string) => {
    const updated = collaborators.map(c => c.id === id ? { ...c, status: (c.status === 'ativo' ? 'inativo' : 'ativo') as Collaborator['status'] } : c);
    db.saveCollaborators(updated);
    setCollaborators(updated);
  };

  const removeCollaborator = (id: string) => {
    const updated = collaborators.filter(c => c.id !== id);
    db.saveCollaborators(updated);
    setCollaborators(updated);
    toast.success("Colaborador removido");
  };

  // Service Types management
  const saveServiceType = () => {
    if (!stForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editingST) {
      const updated = serviceTypes.map(st => st.id === editingST.id ? { ...st, ...stForm } : st);
      db.saveServiceTypes(updated);
      setServiceTypes(updated);
      setEditingST(null);
      toast.success("Serviço atualizado!");
    } else {
      const newST: ServiceType = {
        id: generateId(), name: stForm.name, defaultPrice: stForm.defaultPrice,
        avgExecutionMinutes: stForm.avgExecutionMinutes, avgMarginPercent: stForm.avgMarginPercent,
        isCustom: true, isActive: true, order: serviceTypes.length, createdAt: new Date().toISOString(),
      };
      const updated = [...serviceTypes, newST];
      db.saveServiceTypes(updated);
      setServiceTypes(updated);
      toast.success("Serviço adicionado!");
    }
    setStForm({ name: "", defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0 });
  };

  const removeServiceType = (id: string) => {
    const st = serviceTypes.find(s => s.id === id);
    if (st && !st.isCustom) { toast.error("Tipos padrão não podem ser removidos"); return; }
    const updated = serviceTypes.filter(s => s.id !== id);
    db.saveServiceTypes(updated);
    setServiceTypes(updated);
    toast.success("Serviço removido");
  };

  const moveServiceType = (id: string, dir: -1 | 1) => {
    const idx = serviceTypes.findIndex(s => s.id === id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= serviceTypes.length) return;
    const arr = [...serviceTypes];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    arr.forEach((s, i) => s.order = i);
    db.saveServiceTypes(arr);
    setServiceTypes(arr);
  };

  const startEditST = (st: ServiceType) => {
    setEditingST(st);
    setStForm({ name: st.name, defaultPrice: st.defaultPrice, avgExecutionMinutes: st.avgExecutionMinutes, avgMarginPercent: st.avgMarginPercent });
  };

  const exportBackup = () => {
    const data = db.exportAll();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hig-clean-tec-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Backup exportado!");
  };

  const importBackup = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          db.importAll(reader.result as string);
          setCompany(db.getCompany());
          setCollaborators(db.getCollaborators());
          setServiceTypes(db.getServiceTypes());
          toast.success("Backup restaurado com sucesso!");
        } catch { toast.error("Arquivo de backup inválido"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <PageShell title="Configurações" showBack>
      <div className="mx-auto max-w-md space-y-6">
        {/* Plan Tier */}
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in border border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Plano da Conta</h2>
              <p className="text-xs text-muted-foreground">Gerencie sua assinatura</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">
              {dbPlanTier === 'free' && '🆓 FREE'}
              {dbPlanTier === 'pro' && '⭐ PRO'}
              {dbPlanTier === 'premium' && '👑 PREMIUM'}
            </span>
            {isTrialActive && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Trial — {trialDaysRemaining} dias restantes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {dbPlanTier === 'free' && 'Funcionalidades básicas. Sem personalização visual ou relatórios avançados.'}
            {dbPlanTier === 'pro' && 'Personalização visual, relatórios avançados, estoque integrado e PDF profissional.'}
            {dbPlanTier === 'premium' && 'Tudo do PRO + Dashboard estratégico, manutenção de equipamentos, gráficos e ranking.'}
          </p>
          {dbPlanTier === 'free' && !isTrialActive && (
            <Button onClick={() => navigate('/checkout')} className="mt-3 w-full" size="sm">
              <Crown className="mr-2 h-4 w-4" /> Fazer upgrade
            </Button>
          )}
        </div>

        {/* Theme Selector */}
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in">
          <ThemeSelector
            selectedId={company.selectedThemeId}
            onSelect={handleThemeSelect}
            canChange={dbIsPro}
          />
        </div>

        {/* Company Info */}
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-foreground">Dados da Empresa</h2>
          </div>
          <div className="space-y-3">
            <div><Label>Nome da Empresa</Label><Input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} /></div>
            <div><Label>CNPJ (opcional)</Label><Input value={company.cnpj} onChange={e => setCompany({ ...company, cnpj: e.target.value })} /></div>

            {company.isPro && (
              <>
                <div><Label>Endereço</Label><Input value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} /></div>
                <div><Label>Instagram</Label><Input value={company.instagram} onChange={e => setCompany({ ...company, instagram: e.target.value })} placeholder="@seuinstagram" /></div>
                <div>
                  <Label>Logo da Empresa</Label>
                  <div className="flex items-center gap-3 mt-1">
                    {company.logo && <img src={company.logo} alt="Logo" className="h-12 w-12 rounded-lg object-contain border" />}
                    <label className="flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">
                      <ImagePlus className="h-4 w-4" /> {company.logo ? "Trocar" : "Upload"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
                <div>
                  <Label>Assinatura (imagem)</Label>
                  <div className="flex items-center gap-3 mt-1">
                    {company.signature && <img src={company.signature} alt="Assinatura" className="h-10 rounded-lg object-contain border" />}
                    <label className="flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">
                      <ImagePlus className="h-4 w-4" /> {company.signature ? "Trocar" : "Upload"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                    </label>
                  </div>
                </div>
              </>
            )}
            <Button onClick={saveCompany} className="w-full rounded-full gap-2"><Save className="h-4 w-4" /> Salvar</Button>
          </div>
        </div>

        {/* Collaborators */}
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">Colaboradores</h2>
            </div>
            <Dialog open={collabOpen} onOpenChange={o => { setCollabOpen(o); if (!o) { setEditingCollab(null); setCollabForm({ name: "", role: "", phone: "", cpf: "", admissionDate: "", signature: "" }); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4 max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingCollab ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome Completo *</Label><Input value={collabForm.name} onChange={e => setCollabForm({...collabForm, name: e.target.value})} /></div>
                  <div><Label>Cargo</Label><Input value={collabForm.role} onChange={e => setCollabForm({...collabForm, role: e.target.value})} placeholder="Técnico, Auxiliar..." /></div>
                  <div><Label>Telefone</Label><Input value={collabForm.phone} onChange={e => setCollabForm({...collabForm, phone: e.target.value})} /></div>
                  <div><Label>CPF (opcional)</Label><Input value={collabForm.cpf} onChange={e => setCollabForm({...collabForm, cpf: e.target.value})} /></div>
                  <div><Label>Data de Admissão</Label><Input type="date" value={collabForm.admissionDate} onChange={e => setCollabForm({...collabForm, admissionDate: e.target.value})} /></div>
                  {company.isPro && (
                    <div>
                      <Label>Assinatura Digital (imagem)</Label>
                      <div className="flex items-center gap-3 mt-1">
                        {collabForm.signature && <img src={collabForm.signature} alt="Assinatura" className="h-10 rounded-lg object-contain border" />}
                        <label className="flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">
                          <ImagePlus className="h-4 w-4" /> {collabForm.signature ? "Trocar" : "Upload"}
                          <input type="file" accept="image/*" className="hidden" onChange={handleCollabSignatureUpload} />
                        </label>
                      </div>
                    </div>
                  )}
                  <Button onClick={saveCollaborator} className="w-full rounded-full">Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {collaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum colaborador cadastrado</p>
          ) : (
            <div className="space-y-2">
              {collaborators.map(c => (
              <div key={c.id} className={`rounded-lg border p-3 flex items-center justify-between ${c.status === 'inativo' ? 'opacity-50' : ''}`}>
                  <div>
                    <p className="font-medium text-foreground text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.role || "Sem cargo"} {c.phone && `• ${c.phone}`} • {c.status === 'ativo' ? '✅ Ativo' : '⛔ Inativo'}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setCollabForm({ name: c.name, role: c.role, phone: c.phone, cpf: c.cpf, admissionDate: c.admissionDate, signature: c.signature });
                      setEditingCollab(c);
                      setCollabOpen(true);
                    }}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleCollabStatus(c.id)} title={c.status === 'ativo' ? 'Desativar' : 'Ativar'}>
                      {c.status === 'ativo' ? <UserX className="h-4 w-4 text-warning" /> : <UserCheck className="h-4 w-4 text-success" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCollaborator(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Data (PRO) */}
        {company.isPro && (
          <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">Dados de Pagamento</h2>
            </div>

            {/* Bank Data */}
            <div className="space-y-3 mb-5">
              <h3 className="text-sm font-medium text-muted-foreground">🏦 Dados Bancários</h3>
              <div><Label>Nome do Banco</Label><Input value={company.bankData.bankName} onChange={e => setCompany({ ...company, bankData: { ...company.bankData, bankName: e.target.value } })} placeholder="Ex: Nubank, Itaú..." /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Agência</Label><Input value={company.bankData.agency} onChange={e => setCompany({ ...company, bankData: { ...company.bankData, agency: e.target.value } })} /></div>
                <div><Label>Conta</Label><Input value={company.bankData.account} onChange={e => setCompany({ ...company, bankData: { ...company.bankData, account: e.target.value } })} /></div>
              </div>
              <div>
                <Label>Tipo de Conta</Label>
                <Select value={company.bankData.accountType} onValueChange={v => setCompany({ ...company, bankData: { ...company.bankData, accountType: v as 'corrente' | 'poupanca' } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Nome do Titular</Label><Input value={company.bankData.holderName} onChange={e => setCompany({ ...company, bankData: { ...company.bankData, holderName: e.target.value } })} /></div>
              <div><Label>CNPJ ou CPF do Titular</Label><Input value={company.bankData.holderDocument} onChange={e => setCompany({ ...company, bankData: { ...company.bankData, holderDocument: e.target.value } })} /></div>
            </div>

            {/* Pix Keys */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">⚡ Chaves Pix</h3>
              {company.pixKeys.map(key => (
                <div key={key.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Select value={key.type} onValueChange={v => updatePixKey(key.id, { type: v as PixKey['type'] })}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(pixTypeLabels).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Button variant={key.isPrimary ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setPrimaryPix(key.id)} title="Marcar como principal">
                        <Star className={`h-4 w-4 ${key.isPrimary ? 'fill-current' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePixKey(key.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Input value={key.value} onChange={e => updatePixKey(key.id, { value: e.target.value })} placeholder={`Chave Pix (${pixTypeLabels[key.type]})`} />
                  {key.isPrimary && <span className="text-xs text-primary font-medium">★ Chave Principal</span>}
                </div>
              ))}
              <Button variant="outline" onClick={addPixKey} className="w-full rounded-full gap-2">
                <Plus className="h-4 w-4" /> Adicionar Chave Pix
              </Button>
            </div>

            <Button onClick={saveCompany} className="w-full rounded-full gap-2 mt-4"><Save className="h-4 w-4" /> Salvar Dados de Pagamento</Button>
          </div>
        )}

        {!company.isPro && (
          <div className="rounded-xl bg-muted/50 p-4 text-center animate-fade-in">
            <p className="text-sm text-muted-foreground">💳 Personalização empresarial e dados de pagamento disponíveis na <span className="font-medium text-primary">versão PRO</span></p>
          </div>
        )}

        {/* Service Types */}
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-foreground">Tipos de Serviço</h2>
          </div>

          {/* Add/Edit form */}
          <div className="space-y-2 mb-4 rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">{editingST ? '✏️ Editando serviço' : '➕ Novo serviço'}{!company.isPro && ' (personalização PRO)'}</p>
            <Input value={stForm.name} onChange={e => setStForm({ ...stForm, name: e.target.value })} placeholder="Nome do serviço" className="h-9" disabled={!company.isPro && !editingST} />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-xs text-muted-foreground">Valor padrão (R$)</span>
                <Input type="number" min={0} step="0.01" value={stForm.defaultPrice || ""} onChange={e => setStForm({ ...stForm, defaultPrice: parseFloat(e.target.value) || 0 })} className="h-9" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Tempo (min)</span>
                <Input type="number" min={0} value={stForm.avgExecutionMinutes || ""} onChange={e => setStForm({ ...stForm, avgExecutionMinutes: parseInt(e.target.value) || 0 })} className="h-9" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Margem (%){!company.isPro && ' 🔒'}</span>
                <Input type="number" min={0} max={100} value={stForm.avgMarginPercent || ""} onChange={e => setStForm({ ...stForm, avgMarginPercent: parseFloat(e.target.value) || 0 })} className="h-9" disabled={!company.isPro} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveServiceType} size="sm" className="rounded-full flex-1">{editingST ? 'Atualizar' : 'Adicionar'}</Button>
              {editingST && <Button onClick={() => { setEditingST(null); setStForm({ name: "", defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0 }); }} size="sm" variant="outline" className="rounded-full">Cancelar</Button>}
            </div>
          </div>

          {/* List */}
          <div className="space-y-1.5">
            {serviceTypes.sort((a, b) => a.order - b.order).map(st => (
              <div key={st.id} className={`flex items-center justify-between rounded-lg border p-2.5 text-sm ${!st.isActive ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{st.name} {!st.isActive && <span className="text-xs text-muted-foreground">(inativo)</span>}</p>
                  <p className="text-xs text-muted-foreground">
                    {st.defaultPrice > 0 ? `R$ ${st.defaultPrice.toFixed(2)}` : 'Sem valor padrão'}
                    {st.avgExecutionMinutes > 0 && ` • ${st.avgExecutionMinutes}min`}
                    {company.isPro && st.avgMarginPercent > 0 && ` • ${st.avgMarginPercent}%`}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {company.isPro && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveServiceType(st.id, -1)}><ArrowUp className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveServiceType(st.id, 1)}><ArrowDown className="h-3 w-3" /></Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    const updated = serviceTypes.map(s => s.id === st.id ? { ...s, isActive: !s.isActive } : s);
                    db.saveServiceTypes(updated);
                    setServiceTypes(updated);
                  }} title={st.isActive ? 'Desativar' : 'Ativar'}>
                    {st.isActive ? <UserX className="h-3 w-3 text-warning" /> : <UserCheck className="h-3 w-3 text-success" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditST(st)}><Pencil className="h-3 w-3" /></Button>
                  {company.isPro && st.isCustom && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeServiceType(st.id)}><Trash2 className="h-3 w-3" /></Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proposal text settings (PRO) */}
        {company.isPro && (
          <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in">
            <h2 className="font-semibold text-foreground mb-4">Textos da Proposta Comercial</h2>
            <div className="space-y-3">
              <div><Label>Apresentação da Empresa</Label><Textarea value={company.companyDescription} onChange={e => setCompany({ ...company, companyDescription: e.target.value })} placeholder="Descreva sua empresa..." rows={3} /></div>
              <div><Label>Diferenciais</Label><Textarea value={company.differentials} onChange={e => setCompany({ ...company, differentials: e.target.value })} placeholder="Liste seus diferenciais..." rows={3} /></div>
              <div><Label>Garantia do Serviço</Label><Textarea value={company.serviceGuarantee} onChange={e => setCompany({ ...company, serviceGuarantee: e.target.value })} placeholder="Descreva a garantia..." rows={2} /></div>
              <div><Label>Método de Execução</Label><Textarea value={company.executionMethod} onChange={e => setCompany({ ...company, executionMethod: e.target.value })} placeholder="Descreva o método..." rows={2} /></div>
              <div><Label>Recomendação Técnica</Label><Textarea value={company.technicalRecommendation} onChange={e => setCompany({ ...company, technicalRecommendation: e.target.value })} placeholder="Recomendações ao cliente..." rows={2} /></div>
              <Button onClick={saveCompany} className="w-full rounded-full gap-2"><Save className="h-4 w-4" /> Salvar Textos</Button>
            </div>
          </div>
        )}

        {/* Technician Management */}
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Técnicos</h2>
                <p className="text-xs text-muted-foreground">Acesso restrito ao app</p>
              </div>
            </div>
            <Dialog open={techOpen} onOpenChange={o => { setTechOpen(o); if (!o) { setEditingTech(null); setTechForm({ name: "", email: "", phone: "", pin: "" }); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4">
                <DialogHeader><DialogTitle>{editingTech ? "Editar Técnico" : "Novo Técnico"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome Completo *</Label><Input value={techForm.name} onChange={e => setTechForm({...techForm, name: e.target.value})} placeholder="Nome do técnico" /></div>
                  <div><Label>E-mail (opcional)</Label><Input type="email" value={techForm.email} onChange={e => setTechForm({...techForm, email: e.target.value})} placeholder="email@exemplo.com" /></div>
                  <div><Label>Telefone (opcional)</Label><Input value={techForm.phone} onChange={e => setTechForm({...techForm, phone: e.target.value})} placeholder="(00) 00000-0000" /></div>
                  <div>
                    <Label>PIN de Acesso (4 dígitos) *</Label>
                    <Input
                      type="text"
                      value={techForm.pin}
                      onChange={e => setTechForm({...techForm, pin: e.target.value.replace(/\D/g, "").slice(0, 4)})}
                      placeholder="0000"
                      maxLength={4}
                      inputMode="numeric"
                      className="text-center text-lg tracking-widest font-mono"
                    />
                  </div>
                  <Button onClick={saveTechnician} className="w-full rounded-full">{editingTech ? "Atualizar" : "Cadastrar"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Access Code */}
          {accessCode && (
            <div className="rounded-lg bg-accent/50 p-3 mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Código de Acesso da Empresa</p>
                <p className="text-lg font-bold font-mono tracking-widest text-primary">{accessCode}</p>
                <p className="text-xs text-muted-foreground">Compartilhe com seus técnicos para login</p>
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={copyAccessCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}

          {loadingTechs ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : technicians.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum técnico cadastrado. Cadastre técnicos para que acessem o app com funcionalidades restritas.</p>
          ) : (
            <div className="space-y-2">
              {technicians.map(t => (
                <div key={t.id} className={`rounded-lg border p-3 flex items-center justify-between ${t.status === 'inactive' ? 'opacity-50' : ''}`}>
                  <div>
                    <p className="font-medium text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.email && `${t.email} • `}{t.phone && `${t.phone} • `}
                      {t.status === 'active' ? '✅ Ativo' : '⛔ Inativo'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setTechForm({ name: t.name, email: t.email || "", phone: t.phone || "", pin: t.pin });
                      setEditingTech(t);
                      setTechOpen(true);
                    }}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleTechStatus(t.id, t.status)}>
                      {t.status === 'active' ? <UserX className="h-4 w-4 text-warning" /> : <UserCheck className="h-4 w-4 text-success" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTechnician(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Backup */}
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in">
          <h2 className="font-semibold text-foreground mb-4">Backup de Dados</h2>
          <div className="flex gap-3">
            <Button onClick={exportBackup} variant="outline" className="flex-1 rounded-full gap-2">
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button onClick={importBackup} variant="outline" className="flex-1 rounded-full gap-2">
              <Upload className="h-4 w-4" /> Restaurar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">O backup inclui todos os clientes, agendamentos, produtos, orçamentos, colaboradores e configurações.</p>
        </div>
      </div>
    </PageShell>
  );
}
