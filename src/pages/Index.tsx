import { useNavigate } from "react-router-dom";
import { Users, Calendar, Calculator, Package, FileText, Settings } from "lucide-react";
import logo from "@/assets/logo_app.png";

const menuItems = [
  { path: "/clientes", icon: Users, label: "Clientes", desc: "Gerencie seus clientes" },
  { path: "/agenda", icon: Calendar, label: "Agenda", desc: "Agendamentos e serviços" },
  { path: "/calculadora", icon: Calculator, label: "Calculadora de Diluição", desc: "Calcule dosagens" },
  { path: "/produtos", icon: Package, label: "Produtos", desc: "Cadastro de produtos" },
  { path: "/relatorios", icon: FileText, label: "Relatórios", desc: "Gerar relatórios PDF" },
  { path: "/configuracoes", icon: Settings, label: "Configurações", desc: "Dados e backup" },
];

export default function Dashboard() {
  const navigate = useNavigate();

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

      {/* Menu Grid */}
      <div className="px-4 -mt-4">
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
