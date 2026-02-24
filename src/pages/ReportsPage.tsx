import { useState, useMemo } from "react";
import PageShell from "@/components/PageShell";
import { db, Client, Collaborator, getMaintenanceSuggestion } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Share2, Download, Lock, BarChart3, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { generateServiceReportPDF } from "@/lib/pdf-quote";

type TabType = 'report' | 'neighborhood' | 'clientMap';

export default function ReportsPage() {
  const [clients] = useState(() => db.getClients());
  const [products] = useState(() => db.getProducts());
  const [collaborators] = useState(() => db.getCollaborators().filter(c => c.status === 'ativo'));
  const [appointments] = useState(() => db.getAppointments());
  const [quotes] = useState(() => db.getQuotes());
  const isPro = useMemo(() => db.getCompany().isPro, []);
  const company = useMemo(() => db.getCompany(), []);

  const [tab, setTab] = useState<TabType>('report');
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);
  const clientAppointments = useMemo(() =>
    appointments.filter(a => a.clientId === selectedClientId && a.status === 'concluido'),
    [appointments, selectedClientId]
  );

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    serviceType: "", soilingLevel: "", soilingType: "",
    productsUsed: "", dilutionApplied: "", volumeUsed: "",
    observations: "", technicianId: "", technicianName: "",
    diagnosis: "", procedure: "", dilutionJustification: "", postServiceRecommendations: "",
  });

  const suggestion = getMaintenanceSuggestion(form.serviceType);

  // Neighborhood revenue data
  const neighborhoodData = useMemo(() => {
    const approvedQuotes = quotes.filter(q => q.status === 'aprovado');
    const map = new Map<string, { revenue: number; count: number; clients: Set<string> }>();
    
    approvedQuotes.forEach(q => {
      const client = clients.find(c => c.id === q.clientId);
      const neighborhood = client?.neighborhood || 'Sem bairro';
      const total = q.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
      const disc = q.discountType === 'percent' ? total * (q.discountValue / 100) : q.discountValue;
      const netTotal = Math.max(0, total - disc);
      
      if (!map.has(neighborhood)) map.set(neighborhood, { revenue: 0, count: 0, clients: new Set() });
      const data = map.get(neighborhood)!;
      data.revenue += netTotal;
      data.count++;
      data.clients.add(q.clientId);
    });
    
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, revenue: data.revenue, count: data.count, clientCount: data.clients.size }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [quotes, clients]);

  const totalRevenue = neighborhoodData.reduce((s, d) => s + d.revenue, 0);

  // Client map by region (city + neighborhood grouping)
  const clientsByRegion = useMemo(() => {
    const map = new Map<string, Client[]>();
    clients.forEach(c => {
      const region = [c.city, c.state].filter(Boolean).join('/') || 'Sem cidade';
      if (!map.has(region)) map.set(region, []);
      map.get(region)!.push(c);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [clients]);

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
        ...f, date: appt.date, serviceType: appt.serviceType,
        observations: appt.observations, technicianId: appt.technicianId || "", technicianName: appt.technicianName || "",
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
    window.open(`https://wa.me/?text=${encodeURIComponent(generateText())}`, "_blank");
  };

  const shareGeneral = async () => {
    if (!selectedClient) { toast.error("Selecione o cliente"); return; }
    const text = generateText();
    if (navigator.share) { await navigator.share({ title: "Relatório de Serviço", text }); }
    else { await navigator.clipboard.writeText(text); toast.success("Relatório copiado!"); }
  };

  const downloadPDF = () => {
    if (!selectedClient) { toast.error("Selecione o cliente"); return; }
    const technician = collaborators.find(c => c.id === form.technicianId);
    generateServiceReportPDF({ client: selectedClient, form, suggestion, company, technician: technician || null });
  };

  const openClientRoute = (client: Client) => {
    const addr = client.address || [client.street, client.number, client.neighborhood, client.city, client.state].filter(Boolean).join(", ");
    if (addr) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, "_blank");
    else toast.error("Sem endereço");
  };

  return (
    <PageShell title="Relatórios" showBack>
      <div className="mx-auto max-w-md space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-full bg-accent p-1">
          <button onClick={() => setTab('report')} className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${tab === 'report' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            📄 Relatório
          </button>
          <button onClick={() => setTab('neighborhood')} className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${tab === 'neighborhood' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            📊 Bairros
          </button>
          <button onClick={() => setTab('clientMap')} className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${tab === 'clientMap' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            📍 Mapa
          </button>
        </div>

        {/* Report tab */}
        {tab === 'report' && (
          <>
            <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in space-y-3">
              <div>
                <Label>Cliente</Label>
                <Select onValueChange={handleClientChange} value={selectedClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {selectedClient && (
                <div className="rounded-lg bg-accent/50 border border-border p-3 space-y-1 text-sm animate-fade-in">
                  <p><span className="text-muted-foreground">Endereço:</span> <span className="font-medium text-foreground">{selectedClient.street ? `${selectedClient.street}, ${selectedClient.number}${selectedClient.neighborhood ? ` - ${selectedClient.neighborhood}` : ''}${selectedClient.city ? `, ${selectedClient.city}/${selectedClient.state}` : ''}` : selectedClient.address || "Não informado"}</span></p>
                  <p><span className="text-muted-foreground">Telefone:</span> <span className="font-medium text-foreground">{selectedClient.phone || "Não informado"}</span></p>
                  <p><span className="text-muted-foreground">Tipo de imóvel:</span> <span className="font-medium text-foreground">{selectedClient.propertyType || "Não informado"}</span></p>
                </div>
              )}

              {clientAppointments.length > 0 && (
                <div>
                  <Label>Serviço Concluído</Label>
                  <Select onValueChange={handleAppointmentChange} value={selectedAppointmentId}>
                    <SelectTrigger><SelectValue placeholder="Vincular a um serviço concluído" /></SelectTrigger>
                    <SelectContent>
                      {clientAppointments.map(a => (
                        <SelectItem key={a.id} value={a.id}>{new Date(a.date + "T00:00").toLocaleDateString("pt-BR")} - {a.serviceType}</SelectItem>
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

              {collaborators.length > 0 && (
                <div>
                  <Label>Técnico Responsável</Label>
                  <Select value={form.technicianId} onValueChange={v => {
                    const col = collaborators.find(c => c.id === v);
                    setForm({...form, technicianId: v, technicianName: col?.name || ""});
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                    <SelectContent>{collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.role}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {form.serviceType && (
                <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground animate-fade-in">
                  ⏰ Recomendação: nova higienização em <strong>{suggestion}</strong>
                </div>
              )}
            </div>

            {isPro ? (
              <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in space-y-3">
                <h3 className="font-semibold text-foreground text-sm">📋 Descrição Técnica do Processo</h3>
                <div><Label>Diagnóstico Inicial</Label><Textarea value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} placeholder="Descreva o estado inicial..." rows={2} /></div>
                <div><Label>Procedimento Aplicado</Label><Textarea value={form.procedure} onChange={e => setForm({...form, procedure: e.target.value})} placeholder="Método de extração..." rows={2} /></div>
                <div><Label>Justificativa da Diluição</Label><Textarea value={form.dilutionJustification} onChange={e => setForm({...form, dilutionJustification: e.target.value})} placeholder="Por que essa diluição..." rows={2} /></div>
                <div><Label>Recomendações Pós-serviço</Label><Textarea value={form.postServiceRecommendations} onChange={e => setForm({...form, postServiceRecommendations: e.target.value})} placeholder="Tempo de secagem..." rows={2} /></div>
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
              <Button onClick={shareWhatsApp} className="flex-1 rounded-full gap-2"><FileText className="h-4 w-4" /> WhatsApp</Button>
              <Button onClick={shareGeneral} variant="outline" className="flex-1 rounded-full gap-2"><Share2 className="h-4 w-4" /> Compartilhar</Button>
            </div>
            <Button onClick={downloadPDF} variant="outline" className="w-full rounded-full gap-2"><Download className="h-4 w-4" /> Gerar PDF</Button>
          </>
        )}

        {/* Neighborhood Revenue tab */}
        {tab === 'neighborhood' && (
          <div className="space-y-3 animate-fade-in">
            <div className="rounded-xl bg-card p-5 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Faturamento por Bairro</h2>
                  <p className="text-xs text-muted-foreground">Baseado em orçamentos aprovados</p>
                </div>
              </div>

              {neighborhoodData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum orçamento aprovado ainda</p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg bg-accent p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total faturado</p>
                    <p className="text-2xl font-bold text-primary">R$ {totalRevenue.toFixed(2)}</p>
                  </div>

                  {neighborhoodData.map((d, i) => {
                    const pct = totalRevenue > 0 ? (d.revenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={d.name} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                            <span className="font-medium text-foreground text-sm">{d.name}</span>
                          </div>
                          <span className="font-bold text-primary text-sm">R$ {d.revenue.toFixed(2)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-accent overflow-hidden mb-1">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">{d.count} orçamento(s) • {d.clientCount} cliente(s) • {pct.toFixed(1)}%</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Client Map tab */}
        {tab === 'clientMap' && (
          <div className="space-y-3 animate-fade-in">
            <div className="rounded-xl bg-card p-5 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Mapa de Clientes</h2>
                  <p className="text-xs text-muted-foreground">Agrupados por cidade/região</p>
                </div>
              </div>

              {clientsByRegion.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente cadastrado</p>
              ) : (
                <div className="space-y-4">
                  {clientsByRegion.map(([region, regionClients]) => (
                    <div key={region}>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground text-sm">{region}</h3>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{regionClients.length}</span>
                      </div>
                      
                      {/* Group by neighborhood within city */}
                      {(() => {
                        const byNeighborhood = new Map<string, Client[]>();
                        regionClients.forEach(c => {
                          const nb = c.neighborhood || 'Sem bairro';
                          if (!byNeighborhood.has(nb)) byNeighborhood.set(nb, []);
                          byNeighborhood.get(nb)!.push(c);
                        });
                        return Array.from(byNeighborhood.entries()).map(([nb, nbClients]) => (
                          <div key={nb} className="ml-4 mb-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">🏘️ {nb} ({nbClients.length})</p>
                            <div className="space-y-1">
                              {nbClients.map(c => (
                                <div key={c.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                                  <div>
                                    <p className="font-medium text-foreground">{c.name}</p>
                                    {c.street && <p className="text-xs text-muted-foreground">{c.street}, {c.number}</p>}
                                  </div>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openClientRoute(c)}>
                                    <MapPin className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            {/* Smart route button - group all clients in this neighborhood */}
                            {nbClients.length > 1 && (
                              <Button size="sm" variant="outline" className="mt-1 rounded-full gap-1 text-xs w-full" onClick={() => {
                                const addresses = nbClients
                                  .map(c => c.address || [c.street, c.number, c.neighborhood, c.city, c.state].filter(Boolean).join(", "))
                                  .filter(Boolean);
                                if (addresses.length > 0) {
                                  const origin = encodeURIComponent(addresses[0]);
                                  const destination = encodeURIComponent(addresses[addresses.length - 1]);
                                  const waypoints = addresses.slice(1, -1).map(a => encodeURIComponent(a)).join("|");
                                  const url = `https://www.google.com/maps/dir/${addresses.map(a => encodeURIComponent(a)).join("/")}`;
                                  window.open(url, "_blank");
                                }
                              }}>
                                🧠 Rota inteligente ({nbClients.length} clientes)
                              </Button>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
