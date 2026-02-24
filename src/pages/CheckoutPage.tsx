import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Crown, Camera, BarChart3, Brain, Shield, ArrowLeft, Sparkles } from "lucide-react";
import { startTrial, trackEvent, getSubscription } from "@/lib/analytics";
import { db } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    id: "start",
    name: "START",
    price: 39,
    highlight: false,
    features: [
      "Agenda ilimitada",
      "Cadastro de clientes",
      "Orçamentos básicos",
      "Relatório simples",
    ],
  },
  {
    id: "pro",
    name: "PRO",
    price: 99,
    highlight: true,
    badge: "Mais escolhido",
    features: [
      "Tudo do START",
      "Relatórios com sua marca",
      "Fotos antes e depois no PDF",
      "Controle de estoque automático",
      "Calculadora de diluição integrada",
      "Gestão financeira completa",
      "Registro de não conformidades",
    ],
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: 199,
    highlight: false,
    features: [
      "Tudo do PRO",
      "Dashboard avançado",
      "Suporte prioritário",
      "Multi-técnicos",
      "API de integração",
      "Relatórios avançados",
      "Backup na nuvem",
    ],
  },
];

const benefitSections = [
  {
    icon: Brain,
    title: "Controle Total",
    items: ["Estoque automático", "Cálculo real de custo", "Margem por serviço"],
  },
  {
    icon: Camera,
    title: "Profissionalismo",
    items: ["Fotos antes e depois", "Registro de ocorrências", "Relatório técnico premium"],
  },
  {
    icon: BarChart3,
    title: "Gestão Estratégica",
    items: ["Dashboard de desempenho", "Controle de tempo médio", "Histórico completo por cliente"],
  },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const sub = getSubscription();

  const handleStartTrial = () => {
    startTrial();
    const company = db.getCompany();
    company.planTier = selectedPlan as 'pro' | 'premium';
    company.isPro = true;
    db.saveCompany(company);
    trackEvent("started_trial", { plan: selectedPlan });
    toast({ title: "🎉 Teste grátis ativado!", description: `Você tem 7 dias para experimentar todos os recursos ${selectedPlan.toUpperCase()}.` });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,4%)] via-[hsl(0,0%,6%)] to-[hsl(0,0%,4%)] text-white">
      {/* Back button */}
      <div className="sticky top-0 z-50 bg-[hsl(0,0%,4%,0.9)] backdrop-blur-md border-b border-[hsl(0,0%,12%)]">
        <div className="max-w-3xl mx-auto flex items-center px-4 py-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-[hsl(0,0%,15%)]">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="ml-2 text-sm font-medium text-[hsl(0,0%,60%)]">Voltar</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(43,72%,55%)] to-[hsl(30,80%,45%)] shadow-lg shadow-[hsl(43,72%,45%,0.3)]">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight leading-tight sm:text-4xl">
            Transforme seu negócio em uma{" "}
            <span className="bg-gradient-to-r from-[hsl(43,72%,60%)] to-[hsl(30,80%,50%)] bg-clip-text text-transparent">
              operação profissional
            </span>{" "}
            de alto padrão.
          </h1>
          <p className="mt-4 text-base text-[hsl(0,0%,55%)] max-w-lg mx-auto">
            Tudo que você precisa para controlar, organizar e escalar sua empresa de higienização em um único sistema.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid gap-4 sm:grid-cols-3 mb-14">
          {benefitSections.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,8%)] p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(43,72%,45%,0.12)]">
                <s.icon className="h-5 w-5 text-[hsl(43,72%,60%)]" />
              </div>
              <h3 className="font-bold text-white mb-2">{s.title}</h3>
              <ul className="space-y-1.5">
                {s.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[hsl(0,0%,65%)]">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[hsl(43,72%,55%)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div className="mb-12 text-center">
          <p className="text-sm text-[hsl(0,0%,50%)] italic">
            "Empresas que utilizam sistemas estruturados têm até{" "}
            <span className="font-semibold text-[hsl(43,72%,60%)]">40%</span> mais controle operacional."
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-4 sm:grid-cols-3 mb-12">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-2xl border p-5 text-left transition-all ${
                selectedPlan === plan.id
                  ? "border-[hsl(43,72%,50%)] bg-[hsl(43,72%,45%,0.06)] shadow-lg shadow-[hsl(43,72%,45%,0.1)]"
                  : "border-[hsl(0,0%,14%)] bg-[hsl(0,0%,8%)] hover:border-[hsl(0,0%,22%)]"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[hsl(43,72%,50%)] to-[hsl(30,80%,45%)] px-3 py-0.5 text-xs font-bold text-white">
                  {plan.badge}
                </div>
              )}
              <p className="text-xs font-bold tracking-widest text-[hsl(0,0%,50%)] uppercase">{plan.name}</p>
              <p className="mt-2">
                <span className="text-3xl font-extrabold text-white">R$ {plan.price}</span>
                <span className="text-sm text-[hsl(0,0%,45%)]">/mês</span>
              </p>
              <ul className="mt-4 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[hsl(0,0%,65%)]">
                    <Check className="h-3 w-3 shrink-0 text-[hsl(43,72%,55%)]" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* Guarantee */}
        <div className="mb-8 rounded-2xl border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,8%)] p-5 text-center">
          <Shield className="mx-auto mb-2 h-6 w-6 text-[hsl(152,60%,50%)]" />
          <p className="font-bold text-white">Teste grátis de 7 dias</p>
          <p className="mt-1 text-sm text-[hsl(0,0%,55%)]">Cancele quando quiser. Sem compromisso.</p>
        </div>

        {/* CTA */}
        <Button
          onClick={handleStartTrial}
          disabled={sub.subscriptionStatus === "trial" || sub.subscriptionStatus === "active"}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-[hsl(43,72%,50%)] to-[hsl(30,80%,45%)] text-white text-lg font-bold border-none shadow-xl shadow-[hsl(43,72%,45%,0.25)] hover:from-[hsl(43,72%,55%)] hover:to-[hsl(30,80%,50%)] transition-all"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          {sub.subscriptionStatus === "trial" ? "Teste já ativado" : "Começar Teste Grátis Agora"}
        </Button>

        {sub.subscriptionStatus === "trial" && (
          <p className="mt-3 text-center text-sm text-[hsl(43,72%,60%)]">
            ✨ Seu teste PRO está ativo!
          </p>
        )}

        <p className="mt-6 text-center text-xs text-[hsl(0,0%,35%)]">
          Ao ativar, você concorda com os Termos de Uso e Política de Privacidade.
        </p>
      </div>
    </div>
  );
}
