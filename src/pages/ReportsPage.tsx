import { useState, useMemo } from "react";
import PageShell from "@/components/PageShell";
import { db, Client, Collaborator, getMaintenanceSuggestion } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Share2, Download, Lock } from "lucide-react";
import { toast } from "sonner";
import { generateServiceReportPDF } from "@/lib/pdf-quote";

export default function ReportsPage() {
  const [clients] = useState(() => db.getClients());
  const [products] = useState(() => db.getProducts());
  const [collaborators] = useState(() => db.getCollaborators().filter(c => c.status === 'ativo'));
  const [appointments] = useState(() => db.getAppointments());
  const isPro = useMemo(() => db.getCompany().isPro, []);
  const company = useMemo(() => db.getCompany(), []);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);
  const clientAppointments = useMemo(() =>
    appointments.filter(a => a.clientId === selectedClientId && a.status === 'concluido'),
    [appointments, selectedClientId]
  );
  const selectedAppointment = useMemo(() => appointments.find(a => a.id === selectedAppointmentId), [appointments, selectedAppointmentId]);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    serviceType: "",
    soilingLevel: "",
    soilingType: "",
    productsUsed: "",
    dilutionApplied: "",
    volumeUsed: "",
    observations: "",
    technicianId: "",
    technicianName: "",
    // PRO: Technical description
    diagnosis: "",
    procedure: "",
    dilutionJustification: "",
    postServiceRecommendations: "",
  });

  const suggestion = getMaintenanceSuggestion(form.serviceType);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedAppointmentId("");
    setForm(f => ({ ...f, serviceType: "", technicianId: "", technicianName: "" }));
  };

  const handleAppointmentChange = (apptId: string) => {
    setSelectedAppointmentId(apptId);
    const appt = appointments.find(a => a.id === apptId);
    if (appt) {
      setForm(f => ({
        ...f,
        date: appt.date,
        serviceType: appt.serviceType,
        observations: appt.observations,
        technicianId: appt.technicianId || "",
        technicianName: appt.technicianName || "",
      }));
    }
  };

  const generateText = () => {
    return `
═══════════════════════════
  RELATÓRIO DE SERVIÇO
  ${company.name}
  ${company.phone ? `Tel: ${company.phone}` : ""}
  ${company.cnpj ? `CNPJ: ${company.cnpj}` : ""}
═══════════════════════════

Cliente: ${selectedClient?.name || ""}
Endereço: ${selectedClient?.address || "Não informado"}
Telefone: ${selectedClient?.phone || "Não informado"}
Data: ${new Date(form.date + "T00:00").toLocaleDateString("pt-BR")}
Serviço: ${form.serviceType}
${form.soilingLevel ? `Nível de sujidade: ${form.soilingLevel}` : ""}
${form.soilingType ? `Tipo de sujidade: ${form.soilingType}` : ""}
${form.technicianName ? `Técnico responsável: ${form.technicianName}` : ""}

Produtos utilizados:
${form.productsUsed || "Não informado"}
${form.dilutionApplied ? `Diluição aplicada: ${form.dilutionApplied}` : ""}
${form.volumeUsed ? `Volume utilizado: ${form.volumeUsed}` : ""}

Observações técnicas:
${form.observations || "Sem observações"}

📋 Recomendamos nova higienização em ${suggestion}.

═══════════════════════════
${company.name} - Higienização Profissional
    `.trim();
  };

  const shareWhatsApp = () => {
    if (!selectedClient) { toast.error("Selecione o cliente"); return; }
    const text = encodeURIComponent(generateText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareGeneral = async () => {
    if (!selectedClient) { toast.error("Selecione o cliente"); return; }
    const text = generateText();
    if (navigator.share) {
      await navigator.share({ title: "Relatório de Serviço", text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Relatório copiado para área de transferência!");
    }
  };

  const downloadPDF = () => {
    if (!selectedClient) { toast.error("Selecione o cliente"); return; }
    const technician = collaborators.find(c => c.id === form.technicianId);
    generateServiceReportPDF({
      client: selectedClient,
      form,
      suggestion,
      company,
      technician: technician || null,
    });
  };

  return (
    <PageShell title="Relatórios" showBack>
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in space-y-3">
          {/* Client selector */}
          <div>
            <Label>Cliente</Label>
            <Select onValueChange={handleClientChange} value={selectedClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-populated client info */}
          {selectedClient && (
            <div className="rounded-lg bg-accent/50 border border-border p-3 space-y-1 text-sm animate-fade-in">
              <p><span className="text-muted-foreground">Endereço:</span> <span className="font-medium text-foreground">{selectedClient.address || "Não informado"}</span></p>
              <p><span className="text-muted-foreground">Telefone:</span> <span className="font-medium text-foreground">{selectedClient.phone || "Não informado"}</span></p>
              <p><span className="text-muted-foreground">Tipo de imóvel:</span> <span className="font-medium text-foreground">{selectedClient.propertyType || "Não informado"}</span></p>
            </div>
          )}

          {/* Completed appointments for this client */}
          {clientAppointments.length > 0 && (
            <div>
              <Label>Serviço Concluído</Label>
              <Select onValueChange={handleAppointmentChange} value={selectedAppointmentId}>
                <SelectTrigger><SelectValue placeholder="Vincular a um serviço concluído" /></SelectTrigger>
                <SelectContent>
                  {clientAppointments.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {new Date(a.date + "T00:00").toLocaleDateString("pt-BR")} - {a.serviceType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div><Label>Tipo de Serviço</Label><Input value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value})} placeholder="Higienização de sofá..." /></div>
          <div><Label>Data</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Nível de Sujidade</Label>
              <Select onValueChange={v => setForm({...form, soilingLevel: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Leve">Leve</SelectItem>
                  <SelectItem value="Moderado">Moderado</SelectItem>
                  <SelectItem value="Pesado">Pesado</SelectItem>
                  <SelectItem value="Crítico">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Sujidade</Label>
              <Select onValueChange={v => setForm({...form, soilingType: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gordura">Gordura</SelectItem>
                  <SelectItem value="Mofo">Mofo</SelectItem>
                  <SelectItem value="Poeira acumulada">Poeira acumulada</SelectItem>
                  <SelectItem value="Mancha orgânica">Mancha orgânica</SelectItem>
                  <SelectItem value="Urina">Urina</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div><Label>Produtos Utilizados</Label><Textarea value={form.productsUsed} onChange={e => setForm({...form, productsUsed: e.target.value})} placeholder="Liste os produtos..." /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Diluição Aplicada</Label><Input value={form.dilutionApplied} onChange={e => setForm({...form, dilutionApplied: e.target.value})} placeholder="Ex: 1:10" /></div>
            <div><Label>Volume Utilizado</Label><Input value={form.volumeUsed} onChange={e => setForm({...form, volumeUsed: e.target.value})} placeholder="Ex: 500ml" /></div>
          </div>
          <div><Label>Observações Técnicas</Label><Textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} /></div>

          {/* Technician selector */}
          {collaborators.length > 0 && (
            <div>
              <Label>Técnico Responsável</Label>
              <Select value={form.technicianId} onValueChange={v => {
                const col = collaborators.find(c => c.id === v);
                setForm({...form, technicianId: v, technicianName: col?.name || ""});
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                <SelectContent>
                  {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.serviceType && (
            <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground animate-fade-in">
              ⏰ Recomendação: nova higienização em <strong>{suggestion}</strong>
            </div>
          )}
        </div>

        {/* PRO: Technical Description */}
        {isPro ? (
          <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in space-y-3">
            <h3 className="font-semibold text-foreground text-sm">📋 Descrição Técnica do Processo</h3>
            <div><Label>Diagnóstico Inicial</Label><Textarea value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} placeholder="Descreva o estado inicial do material..." rows={2} /></div>
            <div><Label>Procedimento Aplicado</Label><Textarea value={form.procedure} onChange={e => setForm({...form, procedure: e.target.value})} placeholder="Método de extração, tempo de ação..." rows={2} /></div>
            <div><Label>Justificativa da Diluição</Label><Textarea value={form.dilutionJustification} onChange={e => setForm({...form, dilutionJustification: e.target.value})} placeholder="Por que essa diluição foi escolhida..." rows={2} /></div>
            <div><Label>Recomendações Pós-serviço</Label><Textarea value={form.postServiceRecommendations} onChange={e => setForm({...form, postServiceRecommendations: e.target.value})} placeholder="Tempo de secagem, cuidados..." rows={2} /></div>
          </div>
        ) : (
          <div className="rounded-xl bg-muted/50 p-4 text-center animate-fade-in">
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 text-primary" />
              Relatório técnico profissional disponível na <span className="font-medium text-primary">versão PRO</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={shareWhatsApp} className="flex-1 rounded-full gap-2">
            <FileText className="h-4 w-4" /> WhatsApp
          </Button>
          <Button onClick={shareGeneral} variant="outline" className="flex-1 rounded-full gap-2">
            <Share2 className="h-4 w-4" /> Compartilhar
          </Button>
        </div>
        <Button onClick={downloadPDF} variant="outline" className="w-full rounded-full gap-2">
          <Download className="h-4 w-4" /> Gerar PDF
        </Button>
      </div>
    </PageShell>
  );
}
