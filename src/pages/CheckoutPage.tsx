import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Gem, Shield, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { startTrial, trackEvent, getSubscription } from "@/lib/analytics";
import { db } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface Feature {
  label: string;
  free: boolean;
  pro: boolean;
  premium: boolean;
}

const features: Feature[] = [
  { label: "Agenda ilimitada", free: true, pro: true, premium: true },
  { label: "Cadastro de clientes", free: true, pro: true, premium: true },
  { label: "Orçamentos básicos", free: true, pro: true, premium: true },
  { label: "Relatório simples", free: true, pro: true, premium: true },
  { label: "Relatórios com sua marca", free: false, pro: true, premium: true },
  { label: "Fotos antes e depois no PDF", free: false, pro: true, premium: true },
  { label: "Controle de estoque automático", free: false, pro: true, premium: true },
  { label: "Calculadora de diluição integrada", free: false, pro: true, premium: true },
  { label: "Gestão financeira completa", free: false, pro: true, premium: true },
  { label: "Registro de não conformidades", free: false, pro: true, premium: true },
  { label: "Dashboard estratégico", free: false, pro: false, premium: true },
  { label: "Suporte prioritário", free: false, pro: false, premium: true },
  { label: "Multi-técnicos", free: false, pro: false, premium: true },
  { label: "Manutenção de equipamentos", free: false, pro: false, premium: true },
  { label: "Relatórios avançados", free: false, pro: false, premium: true },
  { label: "Backup na nuvem", free: false, pro: false, premium: true },
];

const plans = [
  {
    id: "pro" as const,
    name: "PRO",
    price: 99,
    icon: Crown,
    badge: "Mais escolhido",
    accent: "hsl(43,72%,50%)",
    description: "Para empresas que querem crescer com controle total.",
  },
  {
    id: "premium" as const,
    name: "PREMIUM",
    price: 199,
    icon: Gem,
    badge: null,
    accent: "hsl(270,60%,55%)",
    description: "Para operações avançadas com múltiplos técnicos.",
  },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium">("pro");
  const sub = getSubscription();
  const [mpReady, setMpReady] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loadingMp, setLoadingMp] = useState(true);
  const paymentBrickRef = useRef<HTMLDivElement>(null);
  const brickControllerRef = useRef<any>(null);

  // Fetch MP public key from admin_settings
  useEffect(() => {
    const fetchPublicKey = async () => {
      try {
        const { data, error } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "mp_public_key")
          .maybeSingle();

        if (data?.setting_value) {
          setPublicKey(data.setting_value);
        }
      } catch (err) {
        console.error("Error fetching MP public key:", err);
      } finally {
        setLoadingMp(false);
      }
    };
    fetchPublicKey();
  }, []);

  // Initialize MercadoPago SDK when public key is available
  useEffect(() => {
    if (!publicKey || !window.MercadoPago) return;

    try {
      const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      setMpReady(true);
      console.log("MercadoPago SDK initialized successfully");
    } catch (err) {
      console.error("Error initializing MercadoPago:", err);
    }
  }, [publicKey]);

  const handleStartTrial = () => {
    startTrial();
    const company = db.getCompany();
    company.planTier = selectedPlan;
    company.isPro = true;
    db.saveCompany(company);
    trackEvent("started_trial", { plan: selectedPlan });
    toast({ title: "🎉 Teste grátis ativado!", description: `Você tem 7 dias para experimentar todos os recursos ${selectedPlan.toUpperCase()}.` });
    navigate("/");
  };

  const selected = plans.find((p) => p.id === selectedPlan)!;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center px-4 py-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="ml-2 text-sm font-medium text-muted-foreground">Voltar</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Escolha o plano ideal para{" "}
            <span className="bg-gradient-to-r from-[hsl(43,72%,60%)] to-[hsl(270,60%,55%)] bg-clip-text text-transparent">
              seu negócio
            </span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Compare os recursos e comece com 7 dias grátis. Cancele quando quiser.
          </p>
        </div>

        {/* Plan cards side by side */}
        <div className="grid gap-5 sm:grid-cols-2 mb-10">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const Icon = plan.icon;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative rounded-2xl border-2 p-6 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-lg"
                    : "border-border bg-card hover:border-muted-foreground/30"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[hsl(43,72%,50%)] to-[hsl(30,80%,45%)] px-3 py-0.5 text-xs font-bold text-white whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${plan.accent}20` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: plan.accent }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{plan.name}</p>
                    <p>
                      <span className="text-3xl font-extrabold">R$ {plan.price}</span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-10">
          <div className="grid grid-cols-[1fr_80px_80px_80px] sm:grid-cols-[1fr_100px_100px_100px] text-center text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/50">
            <div className="p-3 text-left">Recurso</div>
            <div className="p-3">Free</div>
            <div className="p-3" style={{ color: "hsl(43,72%,50%)" }}>Pro</div>
            <div className="p-3" style={{ color: "hsl(270,60%,55%)" }}>Premium</div>
          </div>
          {features.map((f, i) => (
            <div
              key={f.label}
              className={`grid grid-cols-[1fr_80px_80px_80px] sm:grid-cols-[1fr_100px_100px_100px] items-center text-center ${
                i % 2 === 0 ? "bg-transparent" : "bg-muted/20"
              }`}
            >
              <div className="p-3 text-left text-sm">{f.label}</div>
              <CellIcon value={f.free} />
              <CellIcon value={f.pro} />
              <CellIcon value={f.premium} />
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-5 text-center">
          <Shield className="mx-auto mb-2 h-6 w-6 text-[hsl(152,60%,50%)]" />
          <p className="font-bold">Teste grátis de 7 dias</p>
          <p className="mt-1 text-sm text-muted-foreground">Cancele quando quiser. Sem compromisso.</p>
        </div>

        {/* MercadoPago Status */}
        {loadingMp ? (
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando gateway de pagamento...
          </div>
        ) : mpReady ? (
          <div className="mb-4 rounded-xl border border-[hsl(152,60%,50%)]/30 bg-[hsl(152,60%,50%)]/5 p-3 text-center text-sm text-[hsl(152,60%,50%)]">
            ✅ Mercado Pago conectado — pagamentos habilitados
          </div>
        ) : null}

        {/* Payment Brick container */}
        <div ref={paymentBrickRef} id="paymentBrick_container" className="mb-6" />

        {/* CTA */}
        <Button
          onClick={handleStartTrial}
          disabled={sub.subscriptionStatus === "trial" || sub.subscriptionStatus === "active"}
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl transition-all"
          style={{
            background: `linear-gradient(135deg, ${selected.accent}, ${selected.accent}cc)`,
            color: "white",
          }}
        >
          <Sparkles className="mr-2 h-5 w-5" />
          {sub.subscriptionStatus === "trial"
            ? "Teste já ativado"
            : `Começar ${selected.name} — 7 Dias Grátis`}
        </Button>

        {sub.subscriptionStatus === "trial" && (
          <p className="mt-3 text-center text-sm text-primary">✨ Seu teste está ativo!</p>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          Ao ativar, você concorda com os Termos de Uso e Política de Privacidade.
        </p>
      </div>
    </div>
  );
}

function CellIcon({ value }: { value: boolean }) {
  return (
    <div className="p-3 flex justify-center">
      {value ? (
        <Check className="h-4 w-4 text-[hsl(152,60%,50%)]" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground/30" />
      )}
    </div>
  );
}
