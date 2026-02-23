import { useState } from "react";
import PageShell from "@/components/PageShell";
import { db, getMaintenanceSuggestion } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [clients] = useState(() => db.getClients());
  const [products] = useState(() => db.getProducts());
  const [form, setForm] = useState({
    clientName: "",
    serviceType: "",
    date: new Date().toISOString().split("T")[0],
    productsUsed: "",
    observations: "",
  });

  const suggestion = getMaintenanceSuggestion(form.serviceType);
  const company = db.getCompany();

  const generateText = () => {
    return `
═══════════════════════════
  RELATÓRIO DE SERVIÇO
  ${company.name}
  ${company.phone ? `Tel: ${company.phone}` : ""}
  ${company.cnpj ? `CNPJ: ${company.cnpj}` : ""}
═══════════════════════════

Cliente: ${form.clientName}
Data: ${new Date(form.date + "T00:00").toLocaleDateString("pt-BR")}
Serviço: ${form.serviceType}

Produtos utilizados:
${form.productsUsed || "Não informado"}

Observações técnicas:
${form.observations || "Sem observações"}

📋 Recomendamos nova higienização em ${suggestion}.

═══════════════════════════
${company.name} - Higienização Profissional
    `.trim();
  };

  const shareWhatsApp = () => {
    if (!form.clientName) { toast.error("Informe o cliente"); return; }
    const text = encodeURIComponent(generateText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareGeneral = async () => {
    if (!form.clientName) { toast.error("Informe o cliente"); return; }
    const text = generateText();
    if (navigator.share) {
      await navigator.share({ title: "Relatório de Serviço", text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Relatório copiado para área de transferência!");
    }
  };

  return (
    <PageShell title="Relatórios" showBack>
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in space-y-3">
          <div>
            <Label>Cliente</Label>
            <Select onValueChange={v => setForm({...form, clientName: v})}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {clients.length === 0 && <Input className="mt-2" value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} placeholder="Nome do cliente" />}
          </div>
          <div><Label>Tipo de Serviço</Label><Input value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value})} placeholder="Higienização de sofá..." /></div>
          <div><Label>Data</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
          <div><Label>Produtos Utilizados</Label><Textarea value={form.productsUsed} onChange={e => setForm({...form, productsUsed: e.target.value})} placeholder="Liste os produtos..." /></div>
          <div><Label>Observações Técnicas</Label><Textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} /></div>

          {form.serviceType && (
            <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground animate-fade-in">
              ⏰ Recomendação: nova higienização em <strong>{suggestion}</strong>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={shareWhatsApp} className="flex-1 rounded-full gap-2">
            <FileText className="h-4 w-4" /> WhatsApp
          </Button>
          <Button onClick={shareGeneral} variant="outline" className="flex-1 rounded-full gap-2">
            <Share2 className="h-4 w-4" /> Compartilhar
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
