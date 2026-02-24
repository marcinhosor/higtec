import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Calendar, Calculator, Package, FileText, Settings, Receipt, AlertTriangle } from "lucide-react";
import { getLowStockProducts, Product } from "@/lib/storage";
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
  { path: "/configuracoes", icon: Settings, label: "Configurações", desc: "Dados e backup" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  useEffect(() => {
    setLowStockProducts(getLowStockProducts());
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
                <span className={`font-bold ${p.stockStatus === 'critico' ? 'text-destructive' : 'text-warning'}`}>
                  {p.availableVolume?.toFixed(2)}L restantes
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu Grid */}
      <div className={`px-4 ${lowStockProducts.length === 0 ? '-mt-4' : ''}`}>
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