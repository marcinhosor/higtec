import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, ArrowRight, Sparkles, Gem } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import type { PlanTier } from "@/lib/storage";

interface ProUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  requiredTier?: "pro" | "premium";
}

const proBenefits = [
  "Personalização visual com paletas",
  "Relatórios com sua marca",
  "Controle de estoque integrado",
  "PDF profissional sem marca d'água",
  "Cálculo de margem por serviço",
  "Baixa automática de insumos",
];

const premiumBenefits = [
  "Tudo do PRO incluído",
  "Dashboard estratégico completo",
  "Controle de manutenção de equipamentos",
  "Gráficos comparativos mês a mês",
  "Ranking de produtividade de técnicos",
  "PDF totalmente personalizado",
];

export default function ProUpgradeModal({ open, onOpenChange, feature, requiredTier = "pro" }: ProUpgradeModalProps) {
  const navigate = useNavigate();
  const isPremiumRequired = requiredTier === "premium";
  const benefits = isPremiumRequired ? premiumBenefits : proBenefits;
  const tierLabel = isPremiumRequired ? "PREMIUM" : "PRO";
  const TierIcon = isPremiumRequired ? Gem : Crown;

  const handleUpgrade = () => {
    trackEvent("intent_upgrade", { feature, tier: requiredTier });
    trackEvent("clicked_upgrade", { source: "modal" });
    onOpenChange(false);
    navigate("/checkout");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-none bg-gradient-to-b from-[hsl(0,0%,8%)] to-[hsl(0,0%,4%)] p-0 text-white sm:rounded-2xl overflow-hidden">
        {/* Header glow */}
        <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${isPremiumRequired ? 'from-[hsl(270,60%,45%,0.15)]' : 'from-[hsl(43,72%,45%,0.15)]'} to-transparent pointer-events-none`} />
        
        <div className="relative px-6 pt-8 pb-6">
          {/* Icon */}
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${isPremiumRequired ? 'from-[hsl(270,60%,55%)] to-[hsl(280,70%,40%)] shadow-[hsl(270,60%,45%,0.3)]' : 'from-[hsl(43,72%,55%)] to-[hsl(30,80%,45%)] shadow-[hsl(43,72%,45%,0.3)]'} shadow-lg`}>
            <TierIcon className="h-8 w-8 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-center text-2xl font-bold tracking-tight">
            🔓 Desbloqueie o{" "}
            <span className={`bg-gradient-to-r ${isPremiumRequired ? 'from-[hsl(270,60%,65%)] to-[hsl(280,70%,50%)]' : 'from-[hsl(43,72%,60%)] to-[hsl(30,80%,50%)]'} bg-clip-text text-transparent`}>
              {tierLabel}
            </span>
          </h2>
          <p className="mt-2 text-center text-sm text-[hsl(0,0%,65%)]">
            {isPremiumRequired
              ? "Acesse ferramentas estratégicas e controle total do seu negócio."
              : "Transforme seu sistema em uma ferramenta profissional completa."}
          </p>

          {feature && (
            <div className={`mx-auto mt-3 max-w-xs rounded-lg border ${isPremiumRequired ? 'border-[hsl(270,60%,45%,0.3)] bg-[hsl(270,60%,45%,0.08)] text-[hsl(270,60%,75%)]' : 'border-[hsl(43,72%,45%,0.3)] bg-[hsl(43,72%,45%,0.08)] text-[hsl(43,72%,70%)]'} px-3 py-2 text-center text-xs`}>
              <Sparkles className="mr-1 inline h-3 w-3" />
              Recurso {tierLabel}: {feature}
            </div>
          )}

          {/* Benefits */}
          <ul className="mt-6 space-y-2.5">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isPremiumRequired ? 'bg-[hsl(270,60%,45%,0.15)]' : 'bg-[hsl(43,72%,45%,0.15)]'}`}>
                  <Check className={`h-3 w-3 ${isPremiumRequired ? 'text-[hsl(270,60%,65%)]' : 'text-[hsl(43,72%,60%)]'}`} />
                </div>
                <span className="text-[hsl(0,0%,85%)]">{b}</span>
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="mt-6 space-y-2.5">
            <Button
              onClick={handleUpgrade}
              className={`w-full h-12 rounded-xl bg-gradient-to-r ${isPremiumRequired ? 'from-[hsl(270,60%,50%)] to-[hsl(280,70%,40%)] hover:from-[hsl(270,60%,55%)] hover:to-[hsl(280,70%,45%)] shadow-[hsl(270,60%,45%,0.25)]' : 'from-[hsl(43,72%,50%)] to-[hsl(30,80%,45%)] hover:from-[hsl(43,72%,55%)] hover:to-[hsl(30,80%,50%)] shadow-[hsl(43,72%,45%,0.25)]'} text-white font-semibold text-base border-none shadow-lg transition-all`}
            >
              ATIVAR {tierLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                trackEvent("upgrade_dismissed", { feature, tier: requiredTier });
                onOpenChange(false);
              }}
              className="w-full text-[hsl(0,0%,50%)] hover:text-[hsl(0,0%,70%)] hover:bg-[hsl(0,0%,15%)]"
            >
              Continuar versão atual
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
