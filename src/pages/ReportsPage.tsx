import { useState, useMemo } from "react";
import PageShell from "@/components/PageShell";
import { db, Client, Collaborator, getMaintenanceSuggestion, ServiceExecution, Product, Quote, Appointment } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Share2, Download, Lock, BarChart3, MapPin, Users, Package, DollarSign, Route, ClipboardList, Wrench, TrendingUp, Clock } from "lucide-react";
import { exportMonthlyPDF, exportClientsPDF, exportServicesPDF, exportProductsPDF } from "@/lib/pdf-reports";
import { toast } from "sonner";
import { generateServiceReportPDF } from "@/lib/pdf-quote";
import ProUpgradeModal from "@/components/ProUpgradeModal";
import { useProGate } from "@/hooks/use-pro-gate";
import { useCompanyPlan } from "@/hooks/use-company-plan";

type TabType = 'management' | 'report' | 'neighborhood' | 'clientMap';

export default function ReportsPage() {
  const [clients] = useState(() => db.getClients());
  const [products] = useState(() => db.getProducts());
  const [collaborators] = useState(() => db.getCollaborators().filter(c => c.status === 'ativo'));
  const [appointments] = useState(() => db.getAppointments());
  const [quotes] = useState(() => db.getQuotes());
  const [executions] = useState(() => db.getExecutions());
  const companyLocal = useMemo(() => db.getCompany(), []);
  const { isPro } = useCompanyPlan();
  const company = useMemo(() => ({ ...companyLocal, isPro }), [companyLocal, isPro]);
  const { showModal, setShowModal, blockedFeature, requiredTier } = useProGate();

  const [tab, setTab] = useState<TabType>('management');

  // === Management tab state ===
  const [mgmtFilter, setMgmtFilter] = useState<'all' | 'client' | 'month'>('all');
  const [mgmtClientId, setMgmtClientId] = useState("");
  const [mgmtMonth, setMgmtMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [mgmtSection, setMgmtSection] = useState<'monthly' | 'clients' | 'services' | 'products' | 'expenses' | 'routes'>('monthly');

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return opts;
  }, []);

  // Filtered executions based on filter
  const filteredExecutions = useMemo(() => {
    let execs = executions.filter(e => e.status === 'finalizado');
    if (mgmtFilter === 'client' && mgmtClientId) {
      execs = execs.filter(e => e.clientId === mgmtClientId);
    } else if (mgmtFilter === 'month') {
      execs = execs.filter(e => {
        const d = e.endTime || e.startTime || e.createdAt;
        return d?.startsWith(mgmtMonth);
      });
    }
    return execs;
  }, [executions, mgmtFilter, mgmtClientId, mgmtMonth]);

  const filteredAppointments = useMemo(() => {
    let appts = appointments.filter(a => a.status === 'concluido');
    if (mgmtFilter === 'client' && mgmtClientId) {
      appts = appts.filter(a => a.clientId === mgmtClientId);
    } else if (mgmtFilter === 'month') {
      appts = appts.filter(a => a.date?.startsWith(mgmtMonth));
    }
    return appts;
  }, [appointments, mgmtFilter, mgmtClientId, mgmtMonth]);

  const filteredQuotes = useMemo(() => {
    let qs = quotes;
    if (mgmtFilter === 'client' && mgmtClientId) {
      qs = qs.filter(q => q.clientId === mgmtClientId);
    } else if (mgmtFilter === 'month') {
      qs = qs.filter(q => q.date?.startsWith(mgmtMonth));
    }
    return qs;
  }, [quotes, mgmtFilter, mgmtClientId, mgmtMonth]);

  // Helper: get revenue from a quote
  const quoteRevenue = (q: Quote) => {
    const total = q.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
    const disc = q.discountType === 'percent' ? total * (q.discountValue / 100) : q.discountValue;
    return Math.max(0, total - disc);
  };

  // Clients summary (with frequency)
  const clientsSummary = useMemo(() => {
    const clientMap = new Map<string, { name: string; services: number; totalSpent: number; lastService: string; firstService: string }>();
    
    filteredExecutions.forEach(e => {
      const entry = clientMap.get(e.clientId) || { name: e.clientName, services: 0, totalSpent: 0, lastService: '', firstService: '' };
      entry.services++;
      entry.totalSpent += e.totalCost || 0;
      const date = e.endTime || e.startTime || e.createdAt;
      if (!entry.lastService || date > entry.lastService) entry.lastService = date;
      if (!entry.firstService || date < entry.firstService) entry.firstService = date;
      clientMap.set(e.clientId, entry);
    });

    filteredQuotes.filter(q => q.status === 'aprovado').forEach(q => {
      const entry = clientMap.get(q.clientId) || { name: q.clientName, services: 0, totalSpent: 0, lastService: '', firstService: '' };
      entry.totalSpent += quoteRevenue(q);
      clientMap.set(q.clientId, entry);
    });

    return Array.from(clientMap.entries())
      .map(([id, data]) => {
        let avgFrequencyDays: number | null = null;
        if (data.services > 1 && data.firstService && data.lastService) {
          const diff = new Date(data.lastService).getTime() - new Date(data.firstService).getTime();
          avgFrequencyDays = Math.round(diff / (1000 * 60 * 60 * 24) / (data.services - 1));
        }
        return { id, ...data, avgFrequencyDays };
      })
      .sort((a, b) => b.services - a.services);
  }, [filteredExecutions, filteredQuotes]);

  // Services summary (by service type)
  const servicesSummary = useMemo(() => {
    const svcMap = new Map<string, { name: string; count: number; totalRevenue: number; totalCost: number; totalMinutes: number }>();

    filteredExecutions.forEach(e => {
      const entry = svcMap.get(e.serviceType) || { name: e.serviceType, count: 0, totalRevenue: 0, totalCost: 0, totalMinutes: 0 };
      entry.count++;
      entry.totalCost += e.totalCost || 0;
      entry.totalMinutes += e.totalMinutes || 0;
      svcMap.set(e.serviceType, entry);
    });

    filteredQuotes.filter(q => q.status === 'aprovado').forEach(q => {
      q.services.forEach(sv => {
        const svcName = sv.name || 'Outros';
        const entry = svcMap.get(svcName) || { name: svcName, count: 0, totalRevenue: 0, totalCost: 0, totalMinutes: 0 };
        entry.totalRevenue += sv.quantity * sv.unitPrice;
        svcMap.set(svcName, entry);
      });
    });

    return Array.from(svcMap.values())
      .map(s => ({
        ...s,
        avgCost: s.count > 0 ? s.totalCost / s.count : 0,
        avgMinutes: s.count > 0 ? s.totalMinutes / s.count : 0,
        avgMargin: s.totalRevenue > 0 && s.totalCost > 0 ? ((s.totalRevenue - s.totalCost) / s.totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredExecutions, filteredQuotes]);

  // Products summary (enhanced with costs)
  const productsSummary = useMemo(() => {
    const prodMap = new Map<string, { name: string; timesUsed: number; totalVolumeMl: number }>();
    
    filteredExecutions.forEach(e => {
      (e.productsUsed || []).forEach(p => {
        const entry = prodMap.get(p.productId) || { name: p.productName, timesUsed: 0, totalVolumeMl: 0 };
        entry.timesUsed++;
        entry.totalVolumeMl += p.concentratedMl || 0;
        prodMap.set(p.productId, entry);
      });
    });

    return Array.from(prodMap.entries())
      .map(([id, data]) => {
        const product = products.find(pr => pr.id === id);
        const costPerLiter = product?.pricePaid && product?.volumeLiters ? product.pricePaid / product.volumeLiters : 0;
        const totalCost = costPerLiter * (data.totalVolumeMl / 1000);
        const costPerService = data.timesUsed > 0 ? totalCost / data.timesUsed : 0;
        return { id, ...data, costPerLiter, totalCost, costPerService, currentStock: product?.availableVolume ?? null, stockStatus: product?.stockStatus ?? 'normal' };
      })
      .sort((a, b) => b.timesUsed - a.timesUsed);
  }, [filteredExecutions, products]);

  // Monthly summary (enhanced with ticket médio and margin)
  const expensesSummary = useMemo(() => {
    const totalServices = filteredExecutions.length;
    const totalCost = filteredExecutions.reduce((s, e) => s + (e.totalCost || 0), 0);
    const totalMinutes = filteredExecutions.reduce((s, e) => s + (e.totalMinutes || 0), 0);
    
    const approvedQuotes = filteredQuotes.filter(q => q.status === 'aprovado');
    const totalRevenue = approvedQuotes.reduce((s, q) => s + quoteRevenue(q), 0);
    const totalProductCost = productsSummary.reduce((s, p) => s + p.totalCost, 0);
    const ticketMedio = totalServices > 0 ? totalRevenue / totalServices : 0;
    const marginPercent = totalRevenue > 0 ? ((totalRevenue - totalProductCost) / totalRevenue) * 100 : 0;
    const topService = servicesSummary.length > 0 ? servicesSummary[0].name : '-';

    return { totalServices, totalCost, totalMinutes, totalRevenue, totalProductCost, approvedQuotes: approvedQuotes.length, ticketMedio, marginPercent, topService };
  }, [filteredExecutions, filteredQuotes, productsSummary, servicesSummary]);

  // Routes / distances — based on client addresses grouped by region
  const routesSummary = useMemo(() => {
    const clientIds = new Set<string>();
    filteredExecutions.forEach(e => clientIds.add(e.clientId));
    filteredAppointments.forEach(a => clientIds.add(a.clientId));
    
    const routeClients = clients.filter(c => clientIds.has(c.id));
    const byRegion = new Map<string, Client[]>();
    
    routeClients.forEach(c => {
      const region = [c.neighborhood || 'Sem bairro', c.city || ''].filter(Boolean).join(' - ');
      if (!byRegion.has(region)) byRegion.set(region, []);
      byRegion.get(region)!.push(c);
    });

    return Array.from(byRegion.entries())
      .map(([region, cls]) => ({ region, clients: cls, count: cls.length }))
      .sort((a, b) => b.count - a.count);
  }, [filteredExecutions, filteredAppointments, clients]);

  // === Report tab state (existing) ===
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

  const getDefaultProcedure = (serviceType: string) => {
    const servico = serviceType || '{serviço}';
    return `PROCESSO EXCLUSIVO

Mais do que limpeza, uma experiencia de cuidado.

Cada ${servico} e tratado como uma peca de valor.
Nosso protocolo foi desenvolvido para atender clientes que exigem excelencia, discricao e resultados impecaveis.

1. Diagnostico Tecnico Personalizado
Realizamos uma analise minuciosa da peca, identificando o nivel de sujidade, tipos de manchas e caracteristicas especificas da fibra.
Cada tecido possui uma estrutura unica - e nosso cuidado comeca pelo respeito absoluto a essa individualidade.

2. Tratamento Especializado de Alta Performance
Selecionamos produtos profissionais de tecnologia avancada, adequados a composicao do material e ao grau de sujidade encontrado.
As solucoes sao aplicadas de forma tecnica e precisa, preservando textura, cor e maciez.

3. Tempo de Acao Controlado
Respeitamos o tempo tecnico ideal de cada ativo, permitindo que a formulacao atue profundamente na quebra das particulas impregnadas, preparando a superficie para uma remocao eficaz e segura.

4. Escovacao Tecnica Controlada
Executamos escovacao especializada, cuidadosamente calibrada para desprender a sujeira sem agredir as fibras, mantendo o acabamento original do estofado.

5. Enxague por Extracao Profunda
Utilizamos equipamentos profissionais de alta potencia para realizar a extracao completa dos residuos e da umidade, proporcionando limpeza uniforme, revitalizacao das fibras e toque renovado.

6. Finalizacao Sensorial Premium
Concluimos o processo com aplicacao de fragrancia sofisticada e exclusiva, deixando uma assinatura olfativa elegante no ambiente.

Tempo de Secagem
O ${servico} estara completamente seco e pronto para uso em aproximadamente 4 a 8 horas, podendo variar conforme ventilacao, temperatura e tipo de tecido.`;
  };

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

  // Client map by region
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
        procedure: f.procedure || getDefaultProcedure(appt.serviceType),
      }));
    }
  };

  const handleServiceTypeChange = (value: string) => {
    setForm(f => ({
      ...f,
      serviceType: value,
      procedure: (!f.procedure || f.procedure === getDefaultProcedure(f.serviceType)) ? getDefaultProcedure(value) : f.procedure,
    }));
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

  const openGroupRoute = (groupClients: Client[]) => {
    const addresses = groupClients
      .map(c => c.address || [c.street, c.number, c.neighborhood, c.city, c.state].filter(Boolean).join(", "))
      .filter(Boolean);
    if (addresses.length > 0) {
      const url = `https://www.google.com/maps/dir/${addresses.map(a => encodeURIComponent(a)).join("/")}`;
      window.open(url, "_blank");
    }
  };

  const formatMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  return (
    <PageShell title="Relatórios" showBack>
      <div className="mx-auto max-w-md space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-full bg-accent p-1">
          <button onClick={() => setTab('management')} className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${tab === 'management' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            📊 Gestão
          </button>
          <button onClick={() => setTab('report')} className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${tab === 'report' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            📄 Relatório
          </button>
          <button onClick={() => setTab('neighborhood')} className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${tab === 'neighborhood' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            💰 Bairros
          </button>
          <button onClick={() => setTab('clientMap')} className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${tab === 'clientMap' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            📍 Mapa
          </button>
        </div>

        {/* ===== MANAGEMENT TAB ===== */}
        {tab === 'management' && (
          isPro ? (
          <div className="space-y-3 animate-fade-in">
            {/* Filter bar */}
            <div className="rounded-xl bg-card p-4 shadow-card space-y-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Filtros
              </h3>
              
              <div>
                <Label className="text-xs">Filtrar por</Label>
                <Select value={mgmtFilter} onValueChange={(v: 'all' | 'client' | 'month') => setMgmtFilter(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border border-border z-50">
                    <SelectItem value="all">📋 Todos os dados</SelectItem>
                    <SelectItem value="client">👤 Por cliente</SelectItem>
                    <SelectItem value="month">📅 Por mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mgmtFilter === 'client' && (
                <div>
                  <Label className="text-xs">Cliente</Label>
                  <Select value={mgmtClientId} onValueChange={setMgmtClientId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent className="bg-card border border-border z-50">
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mgmtFilter === 'month' && (
                <div>
                  <Label className="text-xs">Mês</Label>
                  <Select value={mgmtMonth} onValueChange={setMgmtMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border border-border z-50">
                      {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Section selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'monthly' as const, icon: BarChart3, label: 'Mensal' },
                { key: 'clients' as const, icon: Users, label: 'Clientes' },
                { key: 'services' as const, icon: Wrench, label: 'Serviços' },
                { key: 'products' as const, icon: Package, label: 'Produtos' },
                { key: 'expenses' as const, icon: DollarSign, label: 'Financeiro' },
                { key: 'routes' as const, icon: Route, label: 'Rotas' },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setMgmtSection(s.key)}
                  className={`flex flex-col items-center gap-1 rounded-xl p-3 text-xs font-medium transition-all ${
                    mgmtSection === s.key
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </button>
              ))}
            </div>

            {/* ==== MONTHLY SECTION ==== */}
            {mgmtSection === 'monthly' && (
              <div className="rounded-xl bg-card p-4 shadow-card space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Relatório Mensal
                  </h3>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                    const label = mgmtFilter === 'month' ? monthOptions.find(m => m.value === mgmtMonth)?.label || '' : mgmtFilter === 'client' ? clients.find(c => c.id === mgmtClientId)?.name || '' : 'Todos os dados';
                    exportMonthlyPDF(company, expensesSummary, label);
                  }}>
                    <Download className="h-3 w-3 mr-1" /> PDF
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-accent p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Total de Serviços</p>
                    <p className="text-lg font-bold text-foreground">{expensesSummary.totalServices}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Faturamento Bruto</p>
                    <p className="text-lg font-bold text-primary">R$ {expensesSummary.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Custo Produtos</p>
                    <p className="text-lg font-bold text-destructive">R$ {expensesSummary.totalProductCost.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-accent p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Margem Média</p>
                    <p className={`text-lg font-bold ${expensesSummary.marginPercent >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {expensesSummary.marginPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
                    <p className="text-sm font-bold text-foreground">R$ {expensesSummary.ticketMedio.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground">Serviço + Vendido</p>
                    <p className="text-sm font-bold text-foreground truncate">{expensesSummary.topService}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground">Tempo Total</p>
                    <p className="text-sm font-bold text-foreground">{formatMinutes(expensesSummary.totalMinutes)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground">Orçamentos Aprovados</p>
                    <p className="text-sm font-bold text-foreground">{expensesSummary.approvedQuotes}</p>
                  </div>
                </div>

                {expensesSummary.totalRevenue > 0 && (
                  <div className="rounded-lg bg-accent p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Lucro Estimado</p>
                    <p className={`text-xl font-bold ${(expensesSummary.totalRevenue - expensesSummary.totalProductCost) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      R$ {(expensesSummary.totalRevenue - expensesSummary.totalProductCost).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ==== CLIENTS SECTION ==== */}
            {mgmtSection === 'clients' && (
              <div className="rounded-xl bg-card p-4 shadow-card space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Relatório por Cliente
                    <span className="ml-auto text-xs text-muted-foreground">{clientsSummary.length} cliente(s)</span>
                  </h3>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                    const label = mgmtFilter === 'month' ? monthOptions.find(m => m.value === mgmtMonth)?.label || '' : 'Todos os dados';
                    exportClientsPDF(company, clientsSummary, label);
                  }}>
                    <Download className="h-3 w-3 mr-1" /> PDF
                  </Button>
                </div>
                
                {clientsSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente com serviço no período</p>
                ) : (
                  <div className="space-y-2">
                    {clientsSummary.map(c => (
                      <div key={c.id} className="rounded-lg border border-border p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground text-sm">{c.name}</span>
                          <span className="text-xs font-bold text-primary">{c.services} serviço(s)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                          {c.totalSpent > 0 && (
                            <span>Faturado: <span className="font-medium text-foreground">R$ {c.totalSpent.toFixed(2)}</span></span>
                          )}
                          {c.avgFrequencyDays != null && (
                            <span>Frequência: <span className="font-medium text-foreground">a cada {c.avgFrequencyDays}d</span></span>
                          )}
                        </div>
                        {c.lastService && (
                          <p className="text-xs text-muted-foreground">Último: {new Date(c.lastService).toLocaleDateString('pt-BR')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==== SERVICES SECTION ==== */}
            {mgmtSection === 'services' && (
              <div className="rounded-xl bg-card p-4 shadow-card space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" /> Relatório por Serviço
                    <span className="ml-auto text-xs text-muted-foreground">{servicesSummary.length} tipo(s)</span>
                  </h3>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                    const label = mgmtFilter === 'month' ? monthOptions.find(m => m.value === mgmtMonth)?.label || '' : 'Todos os dados';
                    exportServicesPDF(company, servicesSummary, label);
                  }}>
                    <Download className="h-3 w-3 mr-1" /> PDF
                  </Button>
                </div>

                {servicesSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum serviço registrado no período</p>
                ) : (
                  <div className="space-y-2">
                    {servicesSummary.map((s, i) => (
                      <div key={s.name} className={`rounded-lg border p-3 space-y-1 ${i === 0 ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground text-sm">{s.name}</span>
                          <span className="text-xs font-bold text-primary">{s.count}x</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                          {s.totalRevenue > 0 && (
                            <span>Receita: <span className="font-medium text-foreground">R$ {s.totalRevenue.toFixed(2)}</span></span>
                          )}
                          {s.avgCost > 0 && (
                            <span>Custo médio: <span className="font-medium text-foreground">R$ {s.avgCost.toFixed(2)}</span></span>
                          )}
                          {s.avgMinutes > 0 && (
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Tempo médio: <span className="font-medium text-foreground">{formatMinutes(s.avgMinutes)}</span></span>
                          )}
                          {s.avgMargin > 0 && (
                            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Margem: <span className="font-medium text-green-600">{s.avgMargin.toFixed(1)}%</span></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==== PRODUCTS SECTION ==== */}
            {mgmtSection === 'products' && (
              <div className="rounded-xl bg-card p-4 shadow-card space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" /> Relatório por Produto
                    <span className="ml-auto text-xs text-muted-foreground">{productsSummary.length} produto(s)</span>
                  </h3>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                    const label = mgmtFilter === 'month' ? monthOptions.find(m => m.value === mgmtMonth)?.label || '' : 'Todos os dados';
                    exportProductsPDF(company, productsSummary, label);
                  }}>
                    <Download className="h-3 w-3 mr-1" /> PDF
                  </Button>
                </div>
                
                {productsSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto registrado no período</p>
                ) : (
                  <div className="space-y-2">
                    {productsSummary.map(p => (
                      <div key={p.id} className="rounded-lg border border-border p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground text-sm">{p.name}</span>
                          <span className="text-xs font-bold text-primary">{p.timesUsed}x usado</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                          <span>Volume: {(p.totalVolumeMl / 1000).toFixed(2)}L</span>
                          {p.totalCost > 0 && (
                            <span>Custo total: <span className="font-medium text-foreground">R$ {p.totalCost.toFixed(2)}</span></span>
                          )}
                          {p.costPerService > 0 && (
                            <span>Custo/serviço: <span className="font-medium text-foreground">R$ {p.costPerService.toFixed(2)}</span></span>
                          )}
                          {p.currentStock != null && (
                            <span className={p.stockStatus === 'critico' ? 'text-destructive font-medium' : ''}>
                              Estoque: {p.currentStock.toFixed(2)}L
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==== EXPENSES / FINANCIAL SECTION ==== */}
            {mgmtSection === 'expenses' && (
              <div className="rounded-xl bg-card p-4 shadow-card space-y-3 animate-fade-in">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" /> Resumo Financeiro
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-accent p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Serviços</p>
                    <p className="text-lg font-bold text-foreground">{expensesSummary.totalServices}</p>
                  </div>
                  <div className="rounded-lg bg-accent p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Tempo Total</p>
                    <p className="text-lg font-bold text-foreground">{formatMinutes(expensesSummary.totalMinutes)}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Faturamento</p>
                    <p className="text-lg font-bold text-primary">R$ {expensesSummary.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Custo Produtos</p>
                    <p className="text-lg font-bold text-destructive">R$ {expensesSummary.totalProductCost.toFixed(2)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Orçamentos aprovados</span>
                    <span className="font-bold text-foreground">{expensesSummary.approvedQuotes}</span>
                  </div>
                </div>

                {expensesSummary.totalRevenue > 0 && (
                  <div className="rounded-lg bg-accent p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Lucro Estimado</p>
                    <p className={`text-lg font-bold ${(expensesSummary.totalRevenue - expensesSummary.totalProductCost) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      R$ {(expensesSummary.totalRevenue - expensesSummary.totalProductCost).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ==== ROUTES SECTION ==== */}
            {mgmtSection === 'routes' && (
              <div className="rounded-xl bg-card p-4 shadow-card space-y-3 animate-fade-in">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Route className="h-4 w-4 text-primary" /> Rotas e Regiões Atendidas
                  <span className="ml-auto text-xs text-muted-foreground">{routesSummary.reduce((s, r) => s + r.count, 0)} cliente(s)</span>
                </h3>

                {routesSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma rota registrada no período</p>
                ) : (
                  <div className="space-y-2">
                    {routesSummary.map(r => (
                      <div key={r.region} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium text-foreground text-sm">{r.region}</span>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{r.count}</span>
                        </div>
                        <div className="space-y-1">
                          {r.clients.map(c => (
                            <div key={c.id} className="flex items-center justify-between text-xs">
                              <span className="text-foreground">{c.name}</span>
                              <button onClick={() => openClientRoute(c)} className="text-primary hover:underline">
                                📍 Ver mapa
                              </button>
                            </div>
                          ))}
                        </div>
                        {r.count > 1 && (
                          <Button size="sm" variant="outline" className="w-full rounded-full gap-1 text-xs" onClick={() => openGroupRoute(r.clients)}>
                            🧠 Rota inteligente ({r.count} clientes)
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          ) : (
            <div className="text-center py-12 space-y-4 animate-fade-in">
              <Lock className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-lg font-bold text-foreground">Relatórios Gerenciais</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Acesse relatórios avançados por mês, cliente, serviço e produto com o plano PRO.
              </p>
              <Button onClick={() => setShowModal(true)} className="rounded-full">Desbloquear com PRO</Button>
            </div>
          )
        )}

        {/* ===== REPORT TAB (existing) ===== */}
        {tab === 'report' && (
          <>
            <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in space-y-3">
              <div>
                <Label>Cliente</Label>
                <Select onValueChange={handleClientChange} value={selectedClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent className="bg-card border border-border z-50">{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
                    <SelectContent className="bg-card border border-border z-50">
                      {clientAppointments.map(a => (
                        <SelectItem key={a.id} value={a.id}>{new Date(a.date + "T00:00").toLocaleDateString("pt-BR")} - {a.serviceType}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div><Label>Tipo de Serviço</Label><Input value={form.serviceType} onChange={e => handleServiceTypeChange(e.target.value)} placeholder="Higienização de sofá..." /></div>
              <div><Label>Data</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Nível de Sujidade</Label>
                  <Select onValueChange={v => setForm({...form, soilingLevel: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent className="bg-card border border-border z-50">
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
                    <SelectContent className="bg-card border border-border z-50">
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
                    <SelectContent className="bg-card border border-border z-50">{collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.role}</SelectItem>)}</SelectContent>
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
                            {nbClients.length > 1 && (
                              <Button size="sm" variant="outline" className="mt-1 rounded-full gap-1 text-xs w-full" onClick={() => openGroupRoute(nbClients)}>
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
      <ProUpgradeModal open={showModal} onOpenChange={setShowModal} feature={blockedFeature} requiredTier={requiredTier} />
    </PageShell>
  );
}
