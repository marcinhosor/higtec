import { useState } from "react";
import PageShell from "@/components/PageShell";
import { db, CompanyInfo, PixKey, Collaborator, generateId } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, Building2, Save, Crown, ImagePlus, CreditCard, Star, Trash2, Plus, Users, UserCheck, UserX } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const pixTypeLabels: Record<PixKey['type'], string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Aleatória',
};

export default function SettingsPage() {
  const [company, setCompany] = useState<CompanyInfo>(() => {
    const c = db.getCompany();
    return {
      ...c,
      bankData: c.bankData || { bankName: '', agency: '', account: '', accountType: 'corrente', holderName: '', holderDocument: '' },
      pixKeys: c.pixKeys || [],
    };
  });

  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => db.getCollaborators());
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabForm, setCollabForm] = useState({ name: "", role: "", phone: "", cpf: "", admissionDate: "", signature: "" });

  const saveCompany = () => {
    db.saveCompany(company);
    toast.success("Dados salvos!");
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
        {/* PRO toggle */}
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Versão PRO</h2>
                <p className="text-xs text-muted-foreground">Personalize logo, dados e remova marca d'água</p>
              </div>
            </div>
            <Switch checked={company.isPro} onCheckedChange={v => setCompany({ ...company, isPro: v })} />
          </div>
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
            <Dialog open={collabOpen} onOpenChange={setCollabOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4 max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Novo Colaborador</DialogTitle></DialogHeader>
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
                    <p className="text-xs text-muted-foreground">{c.role || "Sem cargo"} • {c.status === 'ativo' ? '✅ Ativo' : '⛔ Inativo'}</p>
                  </div>
                  <div className="flex gap-1">
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
