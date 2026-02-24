import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Calendar, Calculator, Package, FileText, Settings, Receipt, AlertTriangle, Clock, BarChart3 } from "lucide-react";
import { getLowStockProducts, Product, db, Client } from "@/lib/storage";
import { updateLastActive } from "@/lib/analytics";
import logo from "@/assets/logo_app.png";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import OnboardingBanner from "@/components/OnboardingBanner";

const menuItems = [
  { path: "/clientes", icon: Users, label: "Clientes", desc: "Gerencie seus clientes" },
  { path: "/agenda", icon: Calendar, label: "Agenda", desc: "Agendamentos e serviços" },
  { path: "/orcamentos", icon: Receipt, label: "Orçamentos", desc: "Crie orçamentos e propostas" },
  { path: "/calculadora", icon: Calculator, label: "Calculadora de Diluição", desc: "Calcule dosagens" },
  { path: "/produtos", icon: Package, label: "Produtos", desc: "Cadastro de produtos" },
  { path: "/relatorios", icon: FileText, label: "Relatórios", desc: "Gerar relatórios PDF" },
  { path: "/painel", icon: BarChart3, label: "Painel Estratégico", desc: "Visão executiva (PREMIUM)" },
  { path: "/configuracoes", icon: Settings, label: "Configurações", desc: "Dados e backup" },
];

type MaintenanceAlert = {
  client: Client;
  monthsSinceLastService: number;
  lastServiceDate: string;
  level: 'recent' | 'warning' | 'danger' | 'urgent';
};

function getMaintenanceAlerts(): MaintenanceAlert[] {
  const clients = db.getClients();
  const now = new Date();
  const alerts: MaintenanceAlert[] = [];

  clients.forEach(client => {
    const history = client.serviceHistory || [];
    let referenceDate: string;

    if (history.length > 0) {
      const lastService = history.reduce((latest, s) => {
        const d = new Date(s.date);
        return d > new Date(latest.date) ? s : latest;
      }, history[0]);
      referenceDate = lastService.date;
    } else {
      // No service history — use client creation date as reference
      referenceDate = client.createdAt;
    }

    if (!referenceDate) return;

    const lastDate = new Date(referenceDate);
    if (isNaN(lastDate.getTime())) return;

    const diffMs = now.getTime() - lastDate.getTime();
    const months = diffMs / (1000 * 60 * 60 * 24 * 30.44);

    if (months >= 3) {
      let level: MaintenanceAlert['level'] = 'recent';
      if (months >= 6) level = 'urgent';
      else if (months >= 5) level = 'danger';
      else if (months >= 4) level = 'warning';

      alerts.push({
        client,
        monthsSinceLastService: Math.floor(months),
        lastServiceDate: referenceDate,
        level,
      });
    }
  });

  // Sort: urgent first, then danger, warning, recent
  const order = { urgent: 0, danger: 1, warning: 2, recent: 3 };
  alerts.sort((a, b) => order[a.level] - order[b.level]);

  return alerts;
}

function getAlertStyles(level: MaintenanceAlert['level']) {
  switch (level) {
    case 'urgent':
      return { bg: 'bg-destructive/15 border-destructive/40', text: 'text-destructive', badge: 'bg-destructive text-destructive-foreground', label: '⚠️ URGENTE' };
    case 'danger':
      return { bg: 'bg-destructive/10 border-destructive/25', text: 'text-destructive', badge: 'bg-destructive/80 text-destructive-foreground', label: '5 meses' };
    case 'warning':
      return { bg: 'bg-yellow-500/10 border-yellow-500/25', text: 'text-yellow-600', badge: 'bg-yellow-500/80 text-white', label: '4 meses' };
    case 'recent':
      return { bg: 'bg-blue-500/10 border-blue-500/25', text: 'text-blue-600', badge: 'bg-blue-500/80 text-white', label: '3 meses' };
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);

  useEffect(() => {
    setLowStockProducts(getLowStockProducts());
    setMaintenanceAlerts(getMaintenanceAlerts());
    updateLastActive();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Hero */}
      <div className="gradient-primary px-6 pb-8 pt-10 text-center">
        <img src={logo} alt="Hig Clean Tec" className="mx-auto mb-3 h-24 w-24 rounded-2xl bg-card/10 object-contain p-2" />
        <h1 className="text-2xl font-extrabold text-primary-foreground tracking-tight">Hig Clean Tec</h1>
        <p className="mt-1 text-sm text-primary-foreground/80 font-medium">
          Gestão Inteligente para Higienização Profissional
        </p>
      </div>

      {/* Onboarding */}
      <OnboardingChecklist />
      <OnboardingBanner />

      {/* Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="px-4 -mt-4 mb-2">
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Estoque Baixo
            </div>
            {lowStockProducts.map(p => (
              <button
                key={p.id}
                onClick={() => navigate("/produtos")}
                className="w-full text-left flex items-center justify-between rounded-lg bg-card p-2 text-xs hover:bg-accent transition-colors"
              >
                <span className="font-medium text-foreground">{p.name}</span>
                <span className={`font-bold ${p.stockStatus === 'critico' ? 'text-destructive' : 'text-yellow-600'}`}>
                  {p.availableVolume?.toFixed(2)}L restantes
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Alerts */}
      {maintenanceAlerts.length > 0 && (
        <div className="px-4 mb-2">
          <div className="rounded-xl bg-card border border-border p-3 space-y-2 shadow-card">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Manutenção Programada
            </div>
            <p className="text-xs text-muted-foreground">Clientes próximos ou acima de 6 meses desde a última higienização</p>
            {maintenanceAlerts.map(alert => {
              const styles = getAlertStyles(alert.level);
              return (
                <button
                  key={alert.client.id}
                  onClick={() => navigate("/clientes")}
                  className={`w-full text-left flex items-center justify-between rounded-lg border p-2.5 text-xs hover:opacity-80 transition-all ${styles.bg}`}
                >
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold ${styles.text}`}>{alert.client.name}</span>
                    <p className="text-muted-foreground text-[10px] mt-0.5 truncate">
                      Último serviço: {new Date(alert.lastServiceDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {alert.level === 'urgent' && <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-pulse" />}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles.badge}`}>
                      {alert.monthsSinceLastService}m {styles.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Menu Grid */}
      <div className={`px-4 ${lowStockProducts.length === 0 && maintenanceAlerts.length === 0 ? '-mt-4' : ''}`}>
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-2 rounded-xl bg-card p-5 shadow-card transition-all hover:shadow-card-hover active:scale-[0.97] animate-fade-in"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground text-center leading-tight">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="mt-auto">
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
          <div className="flex items-center justify-around px-1 py-1.5">
            {[
              { icon: Users, label: "Clientes", path: "/clientes" },
              { icon: Calendar, label: "Agenda", path: "/agenda" },
              { icon: Calculator, label: "Cálculo", path: "/calculadora" },
              { icon: Package, label: "Produtos", path: "/produtos" },
              { icon: Settings, label: "Config", path: "/configuracoes" },
            ].map((n) => (
              <button key={n.path} onClick={() => navigate(n.path)} className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-all">
                <n.icon className="h-5 w-5" />
                <span>{n.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
