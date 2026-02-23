import { useNavigate, useLocation } from "react-router-dom";
import { Home, Users, Calendar, Calculator, Package, Settings } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Início" },
  { path: "/clientes", icon: Users, label: "Clientes" },
  { path: "/agenda", icon: Calendar, label: "Agenda" },
  { path: "/calculadora", icon: Calculator, label: "Cálculo" },
  { path: "/produtos", icon: Package, label: "Produtos" },
  { path: "/configuracoes", icon: Settings, label: "Config" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs transition-all ${
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
