import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyPlan } from "@/hooks/use-company-plan";
import { useAuth } from "@/contexts/AuthContext";
import PageShell from "@/components/PageShell";
import { db, CompanyInfo, PixKey, Collaborator, ServiceType, generateId, THEME_PALETTES, DEFAULT_CUSTOM_THEME } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, Building2, Save, Crown, ImagePlus, CreditCard, Star, Trash2, Plus, Users, UserCheck, UserX, Wrench, ArrowUp, ArrowDown, Pencil, Key, Copy, Shield, Car, Monitor, Smartphone } from "lucide-react";
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
  const { setTheme, setCustomTheme, refresh: refreshTheme } = useTheme();
  const { user } = useAuth();

  const [companyId, setCompanyId] = useState<string | null>(null);
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
  const [loading, setLoading] = useState(true);

  // Collaborators from cloud
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [collabOpen, setCollabOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState<any | null>(null);
  const [collabForm, setCollabForm] = useState({ name: "", role: "", phone: "" });

  // Service types from cloud
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [editingST, setEditingST] = useState<any | null>(null);
  const [stForm, setStForm] = useState({ name: "", defaultPrice: 0, estimatedMinutes: 60 });

  // Technician management state
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [techOpen, setTechOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<any | null>(null);
  const [techForm, setTechForm] = useState({ name: "", email: "", phone: "", pin: "" });
  const [accessCode, setAccessCode] = useState("");
  const [loadingTechs, setLoadingTechs] = useState(false);

  // Vehicle management state
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ model: "", plate: "", fuel_type: "gasolina", avg_consumption_km_l: 10, fuel_price_per_liter: 6.0, collaborator_id: "", notes: "" });

  // Device sessions state
  const [deviceSessions, setDeviceSessions] = useState<any[]>([]);
  // Load company data from cloud
  const loadCloudData = useCallback(async (cId: string) => {
    // Load company
    const { data: companyData } = await supabase.from("companies").select("*").eq("id", cId).single();
    if (companyData) {
      const bankData = (companyData as any).bank_data || { bankName: '', agency: '', account: '', accountType: 'corrente', holderName: '', holderDocument: '' };
      const pixKeys = (companyData as any).pix_keys || [];
      const customTheme = (companyData as any).custom_theme || null;
      setCompany(prev => ({
        ...prev,
        name: companyData.name || '',
        phone: companyData.phone || '',
        cnpj: companyData.cnpj || '',
        address: companyData.address || '',
        logo: companyData.logo_url || '',
        signature: companyData.signature_url || '',
        instagram: (companyData as any).instagram || '',
        companyDescription: (companyData as any).company_description || '',
        differentials: (companyData as any).differentials || '',
        serviceGuarantee: (companyData as any).service_guarantee || '',
        executionMethod: (companyData as any).execution_method || '',
        technicalRecommendation: (companyData as any).technical_recommendation || '',
        selectedThemeId: (companyData as any).selected_theme_id || 'default',
        customTheme: customTheme,
        bankData: bankData,
        pixKeys: pixKeys,
        isPro: dbIsPro,
        planTier: dbPlanTier,
      }));
      setAccessCode(companyData.access_code || '');
    }

    // Load collaborators
    const { data: collabs } = await supabase.from("collaborators").select("*").eq("company_id", cId).order("created_at");
    if (collabs) setCollaborators(collabs);

    // Load service types
    const { data: sts } = await supabase.from("service_types").select("*").eq("company_id", cId).order("sort_order");
    if (sts) setServiceTypes(sts);

    // Load technicians
    const { data: techs } = await supabase.from("technicians").select("*").eq("company_id", cId).order("created_at");
    if (techs) setTechnicians(techs);

    // Load vehicles
    const { data: vehs } = await supabase.from("vehicles").select("*").eq("company_id", cId).order("created_at");
    if (vehs) setVehicles(vehs);

    // Load device sessions
    const { data: devices } = await supabase.from("device_sessions").select("*").eq("company_id", cId).eq("is_active", true).order("last_active_at", { ascending: false });
    if (devices) setDeviceSessions(devices);

    setLoading(false);
  }, [dbIsPro, dbPlanTier]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
      if (!profile?.company_id) { setLoading(false); return; }
      setCompanyId(profile.company_id);
      await loadCloudData(profile.company_id);
    };
    init();
  }, [user, loadCloudData]);

  // Sync plan tier
  useEffect(() => {
    if (!dbIsPro && !isTrialActive) return;
    setCompany(prev => ({ ...prev, isPro: dbIsPro, planTier: dbPlanTier }));
  }, [dbIsPro, dbPlanTier, isTrialActive]);

  // ---- Save Company to Cloud ----
  const saveCompany = async () => {
    if (!companyId) { toast.error("Empresa não encontrada"); return; }
    const { error } = await supabase.from("companies").update({
      name: company.name,
      phone: company.phone || null,
      cnpj: company.cnpj || null,
      address: company.address || null,
      logo_url: company.logo || null,
      signature_url: company.signature || null,
      instagram: company.instagram || '',
      company_description: company.companyDescription || '',
      differentials: company.differentials || '',
      service_guarantee: company.serviceGuarantee || '',
      execution_method: company.executionMethod || '',
      technical_recommendation: company.technicalRecommendation || '',
      selected_theme_id: company.selectedThemeId || 'default',
      custom_theme: company.customTheme || null,
      bank_data: company.bankData || null,
      pix_keys: company.pixKeys || [],
    } as any).eq("id", companyId);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    // Also save locally for theme/PDF compatibility
    db.saveCompany(company);
    refreshTheme();
    toast.success("Dados salvos na nuvem!");
  };

  const handleThemeSelect = (themeId: string) => {
    setCompany(prev => ({ ...prev, selectedThemeId: themeId }));
    setTheme(themeId);
    // Save theme to cloud immediately
    if (companyId) {
      supabase.from("companies").update({ selected_theme_id: themeId, custom_theme: null } as any).eq("id", companyId).then();
    }
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

  // ---- PIX Keys (in-memory, saved with company) ----
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

  // ---- Collaborators (Cloud) ----
  const saveCollaborator = async () => {
    if (!collabForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!companyId) return;
    if (editingCollab) {
      const { error } = await supabase.from("collaborators").update({
        name: collabForm.name, role: collabForm.role || null, phone: collabForm.phone || null,
      }).eq("id", editingCollab.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      setCollaborators(prev => prev.map(c => c.id === editingCollab.id ? { ...c, ...collabForm } : c));
      toast.success("Colaborador atualizado!");
    } else {
      const { data, error } = await supabase.from("collaborators").insert({
        company_id: companyId, name: collabForm.name, role: collabForm.role || null, phone: collabForm.phone || null,
      }).select().single();
      if (error) { toast.error("Erro ao cadastrar"); return; }
      setCollaborators(prev => [...prev, data]);
      toast.success("Colaborador cadastrado!");
    }
    setCollabOpen(false);
    setEditingCollab(null);
    setCollabForm({ name: "", role: "", phone: "" });
  };

  const toggleCollabStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    await supabase.from("collaborators").update({ status: newStatus }).eq("id", id);
    setCollaborators(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const removeCollaborator = async (id: string) => {
    await supabase.from("collaborators").delete().eq("id", id);
    setCollaborators(prev => prev.filter(c => c.id !== id));
    toast.success("Colaborador removido");
  };

  // ---- Service Types (Cloud) ----
  const saveServiceType = async () => {
    if (!stForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!companyId) return;
    if (editingST) {
      const { error } = await supabase.from("service_types").update({
        name: stForm.name, default_price: stForm.defaultPrice, estimated_minutes: stForm.estimatedMinutes,
      }).eq("id", editingST.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      setServiceTypes(prev => prev.map(st => st.id === editingST.id ? { ...st, name: stForm.name, default_price: stForm.defaultPrice, estimated_minutes: stForm.estimatedMinutes } : st));
      setEditingST(null);
      toast.success("Serviço atualizado!");
    } else {
      const { data, error } = await supabase.from("service_types").insert({
        company_id: companyId, name: stForm.name, default_price: stForm.defaultPrice, estimated_minutes: stForm.estimatedMinutes, sort_order: serviceTypes.length,
      }).select().single();
      if (error) { toast.error("Erro ao cadastrar"); return; }
      setServiceTypes(prev => [...prev, data]);
      toast.success("Serviço adicionado!");
    }
    setStForm({ name: "", defaultPrice: 0, estimatedMinutes: 60 });
  };

  const removeServiceType = async (id: string) => {
    await supabase.from("service_types").delete().eq("id", id);
    setServiceTypes(prev => prev.filter(s => s.id !== id));
    toast.success("Serviço removido");
  };

  const toggleServiceType = async (id: string, currentActive: boolean) => {
    await supabase.from("service_types").update({ is_active: !currentActive }).eq("id", id);
    setServiceTypes(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentActive } : s));
  };

  const moveServiceType = async (id: string, dir: -1 | 1) => {
    const idx = serviceTypes.findIndex(s => s.id === id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= serviceTypes.length) return;
    const arr = [...serviceTypes];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    arr.forEach((s, i) => s.sort_order = i);
    setServiceTypes(arr);
    // Update both in DB
    await Promise.all([
      supabase.from("service_types").update({ sort_order: arr[idx].sort_order }).eq("id", arr[idx].id),
      supabase.from("service_types").update({ sort_order: arr[newIdx].sort_order }).eq("id", arr[newIdx].id),
    ]);
  };

  const startEditST = (st: any) => {
    setEditingST(st);
    setStForm({ name: st.name, defaultPrice: st.default_price || 0, estimatedMinutes: st.estimated_minutes || 60 });
  };

  // ---- Technicians (already cloud) ----
  const saveTechnician = async () => {
    if (!techForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (techForm.pin.length !== 4) { toast.error("PIN deve ter 4 dígitos"); return; }
    if (!companyId) { toast.error("Empresa não encontrada"); return; }

    if (editingTech) {
      const { error } = await supabase.from("technicians").update({
        name: techForm.name, email: techForm.email || null, phone: techForm.phone || null, pin: techForm.pin,
      }).eq("id", editingTech.id);
      if (error) { toast.error("Erro ao atualizar técnico"); return; }
      setTechnicians(prev => prev.map(t => t.id === editingTech.id ? { ...t, ...techForm } : t));
      toast.success("Técnico atualizado!");
    } else {
      const { data, error } = await supabase.from("technicians").insert({
        company_id: companyId, name: techForm.name, email: techForm.email || null, phone: techForm.phone || null, pin: techForm.pin,
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

  // ---- Vehicles (Cloud - Premium) ----
  const saveVehicle = async () => {
    if (!vehicleForm.model.trim()) { toast.error("Modelo é obrigatório"); return; }
    if (!companyId) return;
    if (editingVehicle) {
      const { error } = await supabase.from("vehicles").update({
        model: vehicleForm.model, plate: vehicleForm.plate, fuel_type: vehicleForm.fuel_type,
        avg_consumption_km_l: vehicleForm.avg_consumption_km_l, fuel_price_per_liter: vehicleForm.fuel_price_per_liter,
        collaborator_id: vehicleForm.collaborator_id || null, notes: vehicleForm.notes,
      } as any).eq("id", editingVehicle.id);
      if (error) { toast.error("Erro ao atualizar veículo"); return; }
      setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? { ...v, ...vehicleForm, collaborator_id: vehicleForm.collaborator_id || null } : v));
      toast.success("Veículo atualizado!");
    } else {
      const { data, error } = await supabase.from("vehicles").insert({
        company_id: companyId, model: vehicleForm.model, plate: vehicleForm.plate, fuel_type: vehicleForm.fuel_type,
        avg_consumption_km_l: vehicleForm.avg_consumption_km_l, fuel_price_per_liter: vehicleForm.fuel_price_per_liter,
        collaborator_id: vehicleForm.collaborator_id || null, notes: vehicleForm.notes,
      } as any).select().single();
      if (error) { toast.error("Erro ao cadastrar veículo"); return; }
      setVehicles(prev => [...prev, data]);
      toast.success("Veículo cadastrado!");
    }
    setVehicleOpen(false);
    setEditingVehicle(null);
    setVehicleForm({ model: "", plate: "", fuel_type: "gasolina", avg_consumption_km_l: 10, fuel_price_per_liter: 6.0, collaborator_id: "", notes: "" });
  };

  const removeVehicle = async (id: string) => {
    await supabase.from("vehicles").delete().eq("id", id);
    setVehicles(prev => prev.filter(v => v.id !== id));
    toast.success("Veículo removido");
  };

  const revokeDevice = async (deviceId: string) => {
    await supabase.from("device_sessions").update({ is_active: false } as any).eq("id", deviceId);
    setDeviceSessions(prev => prev.filter(d => d.id !== deviceId));
    toast.success("Dispositivo revogado!");
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
          toast.success("Backup restaurado com sucesso!");
        } catch { toast.error("Arquivo de backup inválido"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (loading) {
    return (
      <PageShell title="Configurações" showBack>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </PageShell>
    );
  }

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
            isPro={dbPlanTier === 'pro'}
            isPremium={dbPlanTier === 'premium'}
            customTheme={company.customTheme || DEFAULT_CUSTOM_THEME}
            onCustomTheme={(ct) => {
              setCustomTheme(ct);
              setCompany(prev => ({ ...prev, selectedThemeId: 'custom', customTheme: ct }));
              if (companyId) {
                supabase.from("companies").update({ selected_theme_id: 'custom', custom_theme: ct } as any).eq("id", companyId).then();
              }
              toast.success("Personalização aplicada!");
            }}
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
            <Dialog open={collabOpen} onOpenChange={o => { setCollabOpen(o); if (!o) { setEditingCollab(null); setCollabForm({ name: "", role: "", phone: "" }); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4 max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingCollab ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome Completo *</Label><Input value={collabForm.name} onChange={e => setCollabForm({...collabForm, name: e.target.value})} /></div>
                  <div><Label>Cargo</Label><Input value={collabForm.role} onChange={e => setCollabForm({...collabForm, role: e.target.value})} placeholder="Técnico, Auxiliar..." /></div>
                  <div><Label>Telefone</Label><Input value={collabForm.phone} onChange={e => setCollabForm({...collabForm, phone: e.target.value})} /></div>
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
                      setCollabForm({ name: c.name, role: c.role || '', phone: c.phone || '' });
                      setEditingCollab(c);
                      setCollabOpen(true);
                    }}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleCollabStatus(c.id, c.status)} title={c.status === 'ativo' ? 'Desativar' : 'Ativar'}>
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
            <p className="text-xs font-medium text-muted-foreground">{editingST ? '✏️ Editando serviço' : '➕ Novo serviço'}</p>
            <Input value={stForm.name} onChange={e => setStForm({ ...stForm, name: e.target.value })} placeholder="Nome do serviço" className="h-9" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-muted-foreground">Valor padrão (R$)</span>
                <Input type="number" min={0} step="0.01" value={stForm.defaultPrice || ""} onChange={e => setStForm({ ...stForm, defaultPrice: parseFloat(e.target.value) || 0 })} className="h-9" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Tempo (min)</span>
                <Input type="number" min={0} value={stForm.estimatedMinutes || ""} onChange={e => setStForm({ ...stForm, estimatedMinutes: parseInt(e.target.value) || 0 })} className="h-9" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveServiceType} size="sm" className="rounded-full flex-1">{editingST ? 'Atualizar' : 'Adicionar'}</Button>
              {editingST && <Button onClick={() => { setEditingST(null); setStForm({ name: "", defaultPrice: 0, estimatedMinutes: 60 }); }} size="sm" variant="outline" className="rounded-full">Cancelar</Button>}
            </div>
          </div>

          {/* List */}
          <div className="space-y-1.5">
            {serviceTypes.map(st => (
              <div key={st.id} className={`flex items-center justify-between rounded-lg border p-2.5 text-sm ${!st.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{st.name} {!st.is_active && <span className="text-xs text-muted-foreground">(inativo)</span>}</p>
                  <p className="text-xs text-muted-foreground">
                    {(st.default_price || 0) > 0 ? `R$ ${(st.default_price || 0).toFixed(2)}` : 'Sem valor padrão'}
                    {(st.estimated_minutes || 0) > 0 && ` • ${st.estimated_minutes}min`}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {company.isPro && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveServiceType(st.id, -1)}><ArrowUp className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveServiceType(st.id, 1)}><ArrowDown className="h-3 w-3" /></Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleServiceType(st.id, st.is_active !== false)} title={st.is_active !== false ? 'Desativar' : 'Ativar'}>
                    {st.is_active !== false ? <UserX className="h-3 w-3 text-warning" /> : <UserCheck className="h-3 w-3 text-success" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditST(st)}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeServiceType(st.id)}><Trash2 className="h-3 w-3" /></Button>
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

          {technicians.length === 0 ? (
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

        {/* Device Sessions */}
        {(dbPlanTier === 'pro' || dbPlanTier === 'premium') && deviceSessions.length > 0 && (
          <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Dispositivos Ativos</h2>
                <p className="text-xs text-muted-foreground">
                  {dbPlanTier === 'pro' ? '1 PC + 2 celulares' : '1 PC + 9 celulares'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {deviceSessions.map(d => (
                <div key={d.id} className="rounded-lg border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {d.device_type === 'desktop'
                      ? <Monitor className="h-4 w-4 text-muted-foreground" />
                      : <Smartphone className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-foreground text-sm">{d.device_name || d.device_type}</p>
                      <p className="text-xs text-muted-foreground">
                        Último acesso: {new Date(d.last_active_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => revokeDevice(d.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicles (Premium) */}
        {dbPlanTier === 'premium' && (
          <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Veículos</h2>
                  <p className="text-xs text-muted-foreground">Controle de frota e consumo</p>
                </div>
              </div>
              <Dialog open={vehicleOpen} onOpenChange={o => { setVehicleOpen(o); if (!o) { setEditingVehicle(null); setVehicleForm({ model: "", plate: "", fuel_type: "gasolina", avg_consumption_km_l: 10, fuel_price_per_liter: 6.0, collaborator_id: "", notes: "" }); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md mx-4 max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editingVehicle ? "Editar Veículo" : "Novo Veículo"}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Modelo *</Label><Input value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} placeholder="Ex: Fiat Strada 2020" /></div>
                    <div><Label>Placa</Label><Input value={vehicleForm.plate} onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value.toUpperCase()})} placeholder="ABC-1234" /></div>
                    <div>
                      <Label>Combustível</Label>
                      <Select value={vehicleForm.fuel_type} onValueChange={v => setVehicleForm({...vehicleForm, fuel_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gasolina">Gasolina</SelectItem>
                          <SelectItem value="etanol">Etanol</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="flex">Flex</SelectItem>
                          <SelectItem value="gnv">GNV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Consumo (km/l)</Label><Input type="number" min={0} step={0.1} value={vehicleForm.avg_consumption_km_l || ""} onChange={e => setVehicleForm({...vehicleForm, avg_consumption_km_l: parseFloat(e.target.value) || 0})} /></div>
                      <div><Label>Preço/litro (R$)</Label><Input type="number" min={0} step={0.01} value={vehicleForm.fuel_price_per_liter || ""} onChange={e => setVehicleForm({...vehicleForm, fuel_price_per_liter: parseFloat(e.target.value) || 0})} /></div>
                    </div>
                    <div>
                      <Label>Colaborador vinculado</Label>
                      <Select value={vehicleForm.collaborator_id} onValueChange={v => setVehicleForm({...vehicleForm, collaborator_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          {collaborators.filter(c => c.status === 'ativo').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Observações</Label><Input value={vehicleForm.notes} onChange={e => setVehicleForm({...vehicleForm, notes: e.target.value})} placeholder="Notas sobre o veículo" /></div>
                    <Button onClick={saveVehicle} className="w-full rounded-full">{editingVehicle ? "Atualizar" : "Cadastrar"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum veículo cadastrado</p>
            ) : (
              <div className="space-y-2">
                {vehicles.map(v => (
                  <div key={v.id} className="rounded-lg border p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">{v.model} <span className="text-muted-foreground font-mono">{v.plate}</span></p>
                      <p className="text-xs text-muted-foreground">
                        ⛽ {v.fuel_type} • {v.avg_consumption_km_l} km/l • R$ {(v.fuel_price_per_liter || 0).toFixed(2)}/l
                        {v.collaborator_id && ` • 👤 ${collaborators.find(c => c.id === v.collaborator_id)?.name || "—"}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        setVehicleForm({ model: v.model, plate: v.plate, fuel_type: v.fuel_type, avg_consumption_km_l: v.avg_consumption_km_l, fuel_price_per_liter: v.fuel_price_per_liter, collaborator_id: v.collaborator_id || "", notes: v.notes || "" });
                        setEditingVehicle(v);
                        setVehicleOpen(true);
                      }}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeVehicle(v.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
