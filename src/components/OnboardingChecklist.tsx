import { useState, useEffect } from "react";
import { Check, ChevronRight, Rocket } from "lucide-react";
import { db } from "@/lib/storage";
import { getSubscription, saveSubscription } from "@/lib/analytics";
import { useNavigate } from "react-router-dom";

interface Step {
  id: string;
  label: string;
  done: boolean;
  path: string;
}

export default function OnboardingChecklist() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const sub = getSubscription();
    if (sub.onboardingCompleted) {
      setDismissed(true);
      return;
    }

    const company = db.getCompany();
    const services = db.getServiceTypes().filter(s => s.isActive);
    const products = db.getProducts();

    const s: Step[] = [
      { id: "company", label: "Cadastrar empresa", done: !!company.name && company.name !== "Hig Clean Tec", path: "/configuracoes" },
      { id: "service", label: "Cadastrar primeiro serviço", done: services.some(sv => sv.defaultPrice > 0), path: "/configuracoes" },
      { id: "product", label: "Cadastrar primeiro produto", done: products.length > 0, path: "/produtos" },
    ];
    setSteps(s);

    if (s.every(st => st.done)) {
      sub.onboardingCompleted = true;
      saveSubscription(sub);
    }
  }, []);

  if (dismissed || steps.length === 0 || steps.every(s => s.done)) return null;

  return (
    <div className="mx-4 mb-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Rocket className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Bem-vindo! Configure sua empresa para começar.</p>
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => !step.done && navigate(step.path)}
            disabled={step.done}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
              step.done
                ? "bg-[hsl(var(--success)/0.08)] text-muted-foreground line-through"
                : "bg-accent/50 text-foreground hover:bg-accent"
            }`}
          >
            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              step.done ? "bg-[hsl(var(--success))]" : "border-2 border-muted-foreground/30"
            }`}>
              {step.done && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className="flex-1">{step.label}</span>
            {!step.done && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
        ))}
      </div>
    </div>
  );
}
