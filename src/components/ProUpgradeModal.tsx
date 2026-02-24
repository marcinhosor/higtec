import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

interface ProUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const benefits = [
  "Relatórios com sua marca",
  "Fotos antes e depois no PDF",
  "Controle de diluição automático",
  "Gestão real de estoque",
  "Cálculo de margem por serviço",
  "Agendamento inteligente",
  "Histórico técnico completo",
];

export default function ProUpgradeModal({ open, onOpenChange, feature }: ProUpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    trackEvent("intent_pro_upgrade", { feature });
    trackEvent("clicked_upgrade", { source: "modal" });
    onOpenChange(false);
    navigate("/checkout");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-none bg-gradient-to-b from-[hsl(0,0%,8%)] to-[hsl(0,0%,4%)] p-0 text-white sm:rounded-2xl overflow-hidden">
        {/* Header glow */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[hsl(43,72%,45%,0.15)] to-transparent pointer-events-none" />
        
        <div className="relative px-6 pt-8 pb-6">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(43,72%,55%)] to-[hsl(30,80%,45%)] shadow-lg shadow-[hsl(43,72%,45%,0.3)]">
            <Crown className="h-8 w-8 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-center text-2xl font-bold tracking-tight">
            🔓 Desbloqueie o Modo{" "}
            <span className="bg-gradient-to-r from-[hsl(43,72%,60%)] to-[hsl(30,80%,50%)] bg-clip-text text-transparent">
              PRO
            </span>
          </h2>
          <p className="mt-2 text-center text-sm text-[hsl(0,0%,65%)]">
            Transforme seu sistema em uma ferramenta profissional completa.
          </p>

          {feature && (
            <div className="mx-auto mt-3 max-w-xs rounded-lg border border-[hsl(43,72%,45%,0.3)] bg-[hsl(43,72%,45%,0.08)] px-3 py-2 text-center text-xs text-[hsl(43,72%,70%)]">
              <Sparkles className="mr-1 inline h-3 w-3" />
              Recurso PRO: {feature}
            </div>
          )}

          {/* Benefits */}
          <ul className="mt-6 space-y-2.5">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(43,72%,45%,0.15)]">
                  <Check className="h-3 w-3 text-[hsl(43,72%,60%)]" />
                </div>
                <span className="text-[hsl(0,0%,85%)]">{b}</span>
              </li>
            ))}
          </ul>

          {/* Social proof */}
          <div className="mt-6 rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,10%)] px-4 py-3 text-center text-xs text-[hsl(0,0%,60%)] italic">
            "Profissionais que usam o PRO aumentam em média{" "}
            <span className="font-semibold text-[hsl(43,72%,60%)]">23%</span> a organização e controle operacional."
          </div>

          {/* CTAs */}
          <div className="mt-6 space-y-2.5">
            <Button
              onClick={handleUpgrade}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[hsl(43,72%,50%)] to-[hsl(30,80%,45%)] text-white font-semibold text-base hover:from-[hsl(43,72%,55%)] hover:to-[hsl(30,80%,50%)] border-none shadow-lg shadow-[hsl(43,72%,45%,0.25)] transition-all"
            >
              ATIVAR MODO PRO
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                trackEvent("feature_locked_attempt", { feature, action: "dismissed" });
                onOpenChange(false);
              }}
              className="w-full text-[hsl(0,0%,50%)] hover:text-[hsl(0,0%,70%)] hover:bg-[hsl(0,0%,15%)]"
            >
              Continuar versão gratuita
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
