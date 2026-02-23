import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { db, CompanyInfo } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, Upload, Building2, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [company, setCompany] = useState<CompanyInfo>(db.getCompany());

  const saveCompany = () => {
    db.saveCompany(company);
    toast.success("Dados salvos!");
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
        {/* Company Info */}
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-foreground">Dados da Empresa</h2>
          </div>
          <div className="space-y-3">
            <div><Label>Nome da Empresa</Label><Input value={company.name} onChange={e => setCompany({...company, name: e.target.value})} /></div>
            <div><Label>Telefone</Label><Input value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})} /></div>
            <div><Label>CNPJ (opcional)</Label><Input value={company.cnpj} onChange={e => setCompany({...company, cnpj: e.target.value})} /></div>
            <Button onClick={saveCompany} className="w-full rounded-full gap-2"><Save className="h-4 w-4" /> Salvar</Button>
          </div>
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
          <p className="text-xs text-muted-foreground mt-3">O backup inclui todos os clientes, agendamentos, produtos e configurações.</p>
        </div>
      </div>
    </PageShell>
  );
}
