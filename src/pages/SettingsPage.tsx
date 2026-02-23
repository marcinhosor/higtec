import { useState } from "react";
import PageShell from "@/components/PageShell";
import { db, CompanyInfo } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Download, Upload, Building2, Save, Crown, ImagePlus } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [company, setCompany] = useState<CompanyInfo>(db.getCompany());

  const saveCompany = () => {
    db.saveCompany(company);
    toast.success("Dados salvos!");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCompany({ ...company, logo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCompany({ ...company, signature: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const exportBackup = () => {
    const data = db.exportAll();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hig-clean-tec-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado!");
  };

  const importBackup = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          db.importAll(reader.result as string);
          setCompany(db.getCompany());
          toast.success("Backup restaurado com sucesso!");
        } catch {
          toast.error("Arquivo de backup inválido");
        }
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
          <p className="text-xs text-muted-foreground mt-3">O backup inclui todos os clientes, agendamentos, produtos, orçamentos e configurações.</p>
        </div>
      </div>
    </PageShell>
  );
}
