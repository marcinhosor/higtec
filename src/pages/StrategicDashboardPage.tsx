import { useState, useMemo, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { db, getLowStockProducts, getPendingMaintenanceEquipment, Quote } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Wrench, Package, AlertTriangle, Crown, Clock, Star, FileText, CheckCircle, XCircle, HelpCircle, Fuel } from "lucide-react";
import ProUpgradeModal from "@/components/ProUpgradeModal";
import { useCompanyPlan } from "@/hooks/use-company-plan";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CHART_COLORS = ["hsl(207 90% 54%)", "hsl(152 60% 46%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)", "hsl(270 60% 55%)", "hsl(180 60% 45%)"];

function formatCurrency(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function StrategicDashboardPage() {
  const { planTier } = useCompanyPlan();
  const { user } = useAuth();
  const isPremium = planTier === "premium" || planTier === "pro";
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

  // Vehicle trips data from cloud
  const [tripData, setTripData] = useState<{ totalEstCost: number; totalActCost: number; totalTrips: number; deviations: number }>({ totalEstCost: 0, totalActCost: 0, totalTrips: 0, deviations: 0 });
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).maybeSingle();
      if (!profile?.company_id) return;
      const { data: trips } = await supabase.from("vehicle_trips").select("estimated_cost, actual_cost, route_deviation, status, created_at").eq("company_id", profile.company_id);
      if (!trips) return;
      const yearTrips = trips.filter(t => new Date(t.created_at).getFullYear() === parseInt(selectedYear));
      setTripData({
        totalEstCost: yearTrips.reduce((s, t) => s + ((t as any).estimated_cost || 0), 0),
        totalActCost: yearTrips.reduce((s, t) => s + ((t as any).actual_cost || 0), 0),
        totalTrips: yearTrips.length,
        deviations: yearTrips.filter(t => (t as any).route_deviation).length,
      });
    };
    load();
  }, [user, selectedYear]);

  const clients = useMemo(() => db.getClients(), []);
  const appointments = useMemo(() => db.getAppointments(), []);
  const executions = useMemo(() => db.getExecutions(), []);
  const products = useMemo(() => db.getProducts(), []);
  const collaborators = useMemo(() => db.getCollaborators(), []);
  const quotes = useMemo(() => db.getQuotes(), []);
  const lowStock = useMemo(() => getLowStockProducts(), []);

  const year = parseInt(selectedYear);
  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    executions.forEach(e => years.add(new Date(e.createdAt).getFullYear()));
    appointments.forEach(a => years.add(new Date(a.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [executions, appointments]);

  // Monthly metrics
  const monthlyData = useMemo(() => {
    const data = MONTHS.map((m, i) => ({
      month: m,
      revenue: 0,
      cost: 0,
      services: 0,
      margin: 0,
    }));

    // Revenue from completed appointments matched with quotes
    appointments.filter(a => a.status === "concluido" && new Date(a.date).getFullYear() === year).forEach(a => {
      const monthIdx = new Date(a.date).getMonth();
      // Find quote for this appointment
      const quote = quotes.find(q => q.clientId === a.clientId && q.status === "aprovado");
      if (quote) {
        const total = quote.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
        const disc = quote.discountType === "percent" ? total * quote.discountValue / 100 : quote.discountValue;
        data[monthIdx].revenue += Math.max(0, total - disc);
      }
      data[monthIdx].services += 1;
    });

    // Costs from executions
    executions.filter(e => new Date(e.createdAt).getFullYear() === year).forEach(e => {
      const monthIdx = new Date(e.createdAt).getMonth();
      data[monthIdx].cost += e.totalCost || 0;
    });

    // Calculate margin
    data.forEach(d => {
      d.margin = d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0;
    });

    return data;
  }, [appointments, quotes, executions, year]);

  const totalRevenue = monthlyData.reduce((s, d) => s + d.revenue, 0);
  const totalCost = monthlyData.reduce((s, d) => s + d.cost, 0);
  const totalServices = monthlyData.reduce((s, d) => s + d.services, 0);
  const realMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
  const avgTicket = totalServices > 0 ? totalRevenue / totalServices : 0;

  // Current month vs previous
  const currentMonth = new Date().getMonth();
  const currentMonthRevenue = monthlyData[currentMonth]?.revenue || 0;
  const prevMonthRevenue = currentMonth > 0 ? (monthlyData[currentMonth - 1]?.revenue || 0) : 0;
  const growthPercent = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

  // Technician ranking
  const techRanking = useMemo(() => {
    const map = new Map<string, { name: string; services: number; totalMinutes: number; revenue: number }>();
    executions.filter(e => new Date(e.createdAt).getFullYear() === year).forEach(e => {
      const name = e.technicianName || "Sem técnico";
      const existing = map.get(name) || { name, services: 0, totalMinutes: 0, revenue: 0 };
      existing.services += 1;
      existing.totalMinutes += e.totalMinutes || 0;
      map.set(name, existing);
    });
    // Add revenue from appointments
    appointments.filter(a => a.status === "concluido" && new Date(a.date).getFullYear() === year).forEach(a => {
      const name = a.technicianName || "Sem técnico";
      const existing = map.get(name) || { name, services: 0, totalMinutes: 0, revenue: 0 };
      const quote = quotes.find(q => q.clientId === a.clientId && q.status === "aprovado");
      if (quote) {
        const total = quote.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
        const disc = quote.discountType === "percent" ? total * quote.discountValue / 100 : quote.discountValue;
        existing.revenue += Math.max(0, total - disc);
      }
      if (!map.has(name)) {
        existing.services += 1;
      }
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.services - a.services);
  }, [executions, appointments, quotes, year]);

  // Most sold service
  const topService = useMemo(() => {
    const map = new Map<string, number>();
    appointments.filter(a => a.status === "concluido" && new Date(a.date).getFullYear() === year)
      .forEach(a => map.set(a.serviceType, (map.get(a.serviceType) || 0) + 1));
    let top = { name: "-", count: 0 };
    map.forEach((count, name) => { if (count > top.count) top = { name, count }; });
    return top;
  }, [appointments, year]);

  // Most used product
  const topProduct = useMemo(() => {
    const map = new Map<string, number>();
    executions.filter(e => new Date(e.createdAt).getFullYear() === year).forEach(e => {
      (e.productsUsed || []).forEach(p => map.set(p.productName, (map.get(p.productName) || 0) + 1));
    });
    let top = { name: "-", count: 0 };
    map.forEach((count, name) => { if (count > top.count) top = { name, count }; });
    return top;
  }, [executions, year]);

  // Active/inactive clients
  const activeClients = useMemo(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return clients.filter(c => {
      const history = c.serviceHistory || [];
      if (history.length === 0) return false;
      const lastDate = new Date(history.reduce((latest, s) => new Date(s.date) > new Date(latest.date) ? s : latest, history[0]).date);
      return lastDate >= sixMonthsAgo;
    }).length;
  }, [clients]);

  // Service distribution for pie chart
  const serviceDistribution = useMemo(() => {
    const map = new Map<string, number>();
    appointments.filter(a => a.status === "concluido" && new Date(a.date).getFullYear() === year)
      .forEach(a => map.set(a.serviceType, (map.get(a.serviceType) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [appointments, year]);

  // Pending maintenance count
  const pendingMaintenance = useMemo(() => {
    const now = new Date();
    return clients.filter(c => {
      const history = c.serviceHistory || [];
      const refDate = history.length > 0
        ? new Date(history.reduce((l, s) => new Date(s.date) > new Date(l.date) ? s : l, history[0]).date)
        : new Date(c.createdAt);
      return (now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44) >= 6;
    }).length;
  }, [clients]);

  // Gate: only PREMIUM
  if (!isPremium) {
    return (
      <PageShell title="Painel Estratégico" showBack>
        <div className="mx-auto max-w-md text-center py-16 px-4 space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/10">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Painel Estratégico</h2>
          <p className="text-sm text-muted-foreground">
            Disponível exclusivamente no plano <span className="font-semibold text-primary">PREMIUM</span>. 
            Acesse gráficos comparativos, ranking de técnicos e visão executiva completa.
          </p>
          <ProUpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} feature="Painel Estratégico" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Painel Estratégico" showBack>
      <div className="mx-auto max-w-lg space-y-4 pb-4">
        {/* Year filter */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" /> Visão Executiva
          </h2>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard icon={DollarSign} label="Faturamento Anual" value={formatCurrency(totalRevenue)} accent />
          <KPICard icon={DollarSign} label="Faturamento Mensal" value={formatCurrency(currentMonthRevenue)}
            trend={growthPercent !== 0 ? { value: growthPercent, up: growthPercent > 0 } : undefined} />
          <KPICard icon={TrendingUp} label="Margem Real" value={`${realMargin.toFixed(1)}%`} />
          <KPICard icon={DollarSign} label="Ticket Médio" value={formatCurrency(avgTicket)} />
          <KPICard icon={Wrench} label="Serviço Top" value={topService.name} sub={`${topService.count}x`} />
          <KPICard icon={Package} label="Produto Top" value={topProduct.name} sub={`${topProduct.count}x`} />
          <KPICard icon={Users} label="Clientes Ativos" value={String(activeClients)} sub={`de ${clients.length}`} />
          <KPICard icon={Users} label="Inativos" value={String(clients.length - activeClients)} warn={clients.length - activeClients > 0} />
        </div>

        {/* Alert badges */}
        <div className="flex gap-2 flex-wrap">
          {lowStock.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> {lowStock.length} produto(s) estoque crítico
            </div>
          )}
          {pendingMaintenance > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-warning/10 border border-warning/20 px-3 py-1.5 text-xs font-medium text-warning">
              <Clock className="h-3.5 w-3.5" /> {pendingMaintenance} manutenção(ões) pendente(s)
            </div>
          )}
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Faturamento vs Custo (Mensal)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="revenue" name="Faturamento" fill="hsl(207 90% 54%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="Custo" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Growth Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Crescimento Mensal (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData.map((d, i) => ({
                  month: d.month,
                  growth: i > 0 && monthlyData[i - 1].revenue > 0
                    ? ((d.revenue - monthlyData[i - 1].revenue) / monthlyData[i - 1].revenue) * 100
                    : 0,
                  margin: d.margin,
                }))} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Line type="monotone" dataKey="growth" name="Crescimento" stroke="hsl(207 90% 54%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="margin" name="Margem" stroke="hsl(152 60% 46%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Service Distribution */}
        {serviceDistribution.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Distribuição de Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie data={serviceDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} strokeWidth={2}>
                      {serviceDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {serviceDistribution.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="truncate text-foreground">{s.name}</span>
                      <span className="ml-auto font-semibold text-muted-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technician Ranking */}
        {techRanking.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-warning" /> Ranking de Técnicos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {techRanking.map((tech, i) => (
                <div key={tech.name} className={`flex items-center gap-3 rounded-lg border p-3 ${i === 0 ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    i === 0 ? 'bg-primary text-primary-foreground' :
                    i === 1 ? 'bg-muted text-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}º
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{tech.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tech.services} serviço(s)
                      {tech.totalMinutes > 0 && ` • ${Math.floor(tech.totalMinutes / 60)}h${tech.totalMinutes % 60}min`}
                    </p>
                  </div>
                  {tech.revenue > 0 && (
                    <span className="text-xs font-semibold text-primary">{formatCurrency(tech.revenue)}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quote Conversion Report */}
        <QuoteConversionSection quotes={quotes} year={year} />

        {/* Vehicle Displacement Costs */}
        {tripData.totalTrips > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Fuel className="h-4 w-4 text-primary" /> Custos de Deslocamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <SummaryRow label="Total Viagens" value={String(tripData.totalTrips)} />
                <SummaryRow label="Desvios de Rota" value={String(tripData.deviations)} highlight={tripData.deviations > 0} />
                <SummaryRow label="Custo Estimado" value={formatCurrency(tripData.totalEstCost)} />
                <SummaryRow label="Custo Real" value={formatCurrency(tripData.totalActCost)} highlight />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Resumo do Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <SummaryRow label="Custo Operacional" value={formatCurrency(totalCost)} />
              <SummaryRow label="Custo Deslocamento" value={formatCurrency(tripData.totalActCost)} />
              <SummaryRow label="Custo Total" value={formatCurrency(totalCost + tripData.totalActCost)} />
              <SummaryRow label="Lucro Bruto" value={formatCurrency(totalRevenue - totalCost - tripData.totalActCost)} highlight />
              <SummaryRow label="Total Serviços" value={String(totalServices)} />
              <SummaryRow label="Média/Mês" value={(totalServices / 12).toFixed(1)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function KPICard({ icon: Icon, label, value, sub, accent, warn, trend }: {
  icon: any; label: string; value: string; sub?: string; accent?: boolean; warn?: boolean;
  trend?: { value: number; up: boolean };
}) {
  return (
    <div className={`rounded-xl border p-3 space-y-1 ${accent ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${warn ? 'text-destructive' : 'text-primary'}`} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-base font-bold truncate ${warn ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      <div className="flex items-center gap-1">
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
        {trend && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${trend.up ? 'text-success' : 'text-destructive'}`}>
            {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`font-semibold text-sm ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function QuoteConversionSection({ quotes, year }: { quotes: Quote[]; year: number }) {
  const [filter, setFilter] = useState<'all' | 'aprovado' | 'recusado' | 'pendente' | 'nao_respondeu'>('all');

  const yearQuotes = useMemo(() => 
    quotes.filter(q => q.date && new Date(q.date + "T00:00").getFullYear() === year),
    [quotes, year]
  );

  const approved = yearQuotes.filter(q => q.status === 'aprovado');
  const rejected = yearQuotes.filter(q => q.status === 'recusado');
  const pending = yearQuotes.filter(q => q.status === 'pendente');
  const noResponse = yearQuotes.filter(q => q.status === 'nao_respondeu');
  const conversionRate = yearQuotes.length > 0 ? (approved.length / yearQuotes.length) * 100 : 0;

  const totalApproved = approved.reduce((sum, q) => {
    const sub = q.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
    const disc = q.discountType === 'percent' ? sub * q.discountValue / 100 : q.discountValue;
    return sum + Math.max(0, sub - disc);
  }, 0);

  const totalLost = rejected.reduce((sum, q) => {
    const sub = q.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
    const disc = q.discountType === 'percent' ? sub * q.discountValue / 100 : q.discountValue;
    return sum + Math.max(0, sub - disc);
  }, 0);

  const filteredQuotes = filter === 'all' ? yearQuotes :
    yearQuotes.filter(q => q.status === filter);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-3.5 w-3.5 text-success" />;
      case 'recusado': return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case 'nao_respondeu': return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />;
      default: return <Clock className="h-3.5 w-3.5 text-warning" />;
    }
  };

  const statusLabel: Record<string, string> = {
    aprovado: 'Aprovado',
    recusado: 'Recusado',
    pendente: 'Pendente',
    nao_respondeu: 'Não respondeu',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Conversão de Orçamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-success/10 border border-success/20 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Aprovados</p>
            <p className="text-lg font-bold text-success">{approved.length}</p>
            <p className="text-[10px] text-success">{formatCurrency(totalApproved)}</p>
          </div>
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Recusados</p>
            <p className="text-lg font-bold text-destructive">{rejected.length}</p>
            <p className="text-[10px] text-destructive">{formatCurrency(totalLost)}</p>
          </div>
          <div className="rounded-lg bg-warning/10 border border-warning/20 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Pendentes</p>
            <p className="text-lg font-bold text-warning">{pending.length}</p>
          </div>
          <div className="rounded-lg bg-muted border p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Sem resposta</p>
            <p className="text-lg font-bold text-muted-foreground">{noResponse.length}</p>
          </div>
        </div>

        {/* Conversion rate */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Taxa de Conversão</span>
          <span className={`text-lg font-bold ${conversionRate >= 50 ? 'text-success' : conversionRate >= 25 ? 'text-warning' : 'text-destructive'}`}>
            {conversionRate.toFixed(1)}%
          </span>
        </div>

        {/* Filter */}
        <div className="flex gap-1 flex-wrap">
          {(['all', 'aprovado', 'recusado', 'pendente', 'nao_respondeu'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium border transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              {f === 'all' ? `Todos (${yearQuotes.length})` :
               f === 'aprovado' ? `✅ Aprovados (${approved.length})` :
               f === 'recusado' ? `❌ Recusados (${rejected.length})` :
               f === 'pendente' ? `⏳ Pendentes (${pending.length})` :
               `❓ Sem resposta (${noResponse.length})`}
            </button>
          ))}
        </div>

        {/* Client list */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {filteredQuotes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum orçamento neste filtro</p>
          ) : (
            filteredQuotes.map(q => {
              const sub = q.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
              const disc = q.discountType === 'percent' ? sub * q.discountValue / 100 : q.discountValue;
              const total = Math.max(0, sub - disc);
              return (
                <div key={q.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-xs">
                  {statusIcon(q.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{q.clientName}</p>
                    <p className="text-muted-foreground">{String(q.number).padStart(2, '0')}/{q.date ? new Date(q.date + "T00:00").getFullYear() : ''} • {q.services.map(s => s.name).join(', ')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-foreground">{formatCurrency(total)}</p>
                    <p className={`text-[10px] ${
                      q.status === 'aprovado' ? 'text-success' :
                      q.status === 'recusado' ? 'text-destructive' :
                      'text-muted-foreground'
                    }`}>{statusLabel[q.status]}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
