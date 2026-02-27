import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check, X, Crown, Gem, Shield, ArrowLeft, Sparkles, Loader2,
  CreditCard, QrCode, FileText, Copy, ExternalLink,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyPlan } from "@/hooks/use-company-plan";
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
    id: "pro" as const, name: "PRO", price: 99, icon: Crown,
    badge: "Mais escolhido", accent: "hsl(43,72%,50%)",
    description: "Para empresas que querem crescer com controle total.",
  },
  {
    id: "premium" as const, name: "PREMIUM", price: 199, icon: Gem,
    badge: null, accent: "hsl(270,60%,55%)",
    description: "Para operações avançadas com múltiplos técnicos.",
  },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { planTier, companyId, isTrialActive, refresh: refreshPlan } = useCompanyPlan();
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium">("pro");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loadingMp, setLoadingMp] = useState(true);
  const [mpInstance, setMpInstance] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [docType, setDocType] = useState("CPF");
  const [docNumber, setDocNumber] = useState("");
  const [installments, setInstallments] = useState(1);

  // Pix/Boleto state
  const [payerEmail, setPayerEmail] = useState(user?.email || "");
  const [payerFirstName, setPayerFirstName] = useState("");
  const [payerLastName, setPayerLastName] = useState("");

  // Trial is available only if user is on free plan and not already trialing
  const canTrial = planTier === "free" && !isTrialActive;

  // Fetch public key
  useEffect(() => {
    const fetchPk = async () => {
      try {
        const { data } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "mp_public_key")
          .maybeSingle();
        if (data?.setting_value) setPublicKey(data.setting_value);
      } catch (err) {
        console.error("Error fetching MP public key:", err);
      } finally {
        setLoadingMp(false);
      }
    };
    fetchPk();
  }, []);

  // Init MP SDK
  useEffect(() => {
    if (!publicKey || !window.MercadoPago) return;
    try {
      const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      setMpInstance(mp);
    } catch (err) {
      console.error("Error initializing MercadoPago:", err);
    }
  }, [publicKey]);

  useEffect(() => {
    if (user?.email) setPayerEmail(user.email);
  }, [user]);

  const processPayment = useCallback(async (paymentType: string, extraData: Record<string, any> = {}) => {
    if (!user) {
      toast({ title: "Faça login para continuar", variant: "destructive" });
      navigate("/login");
      return;
    }
    setProcessing(true);
    setPaymentResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          plan: selectedPlan,
          payment_type: paymentType,
          payer: {
            email: payerEmail,
            identification: { type: docType, number: docNumber },
            first_name: payerFirstName,
            last_name: payerLastName,
          },
          ...extraData,
        },
      });

      if (error) throw new Error(error.message || "Erro ao processar pagamento");
      if (data?.error) throw new Error(data.error);

      trackEvent("payment_processed", { plan: selectedPlan, type: paymentType, status: data.status });
      setPaymentResult({ ...data, payment_type: paymentType });

      if (data.status === "approved") {
        toast({ title: "🎉 Pagamento aprovado!", description: "Seu plano será ativado em instantes." });
        // Refresh plan from DB after webhook processes
        setTimeout(async () => {
          await refreshPlan();
          navigate("/");
        }, 3000);
      } else if (data.status === "pending" || data.status === "in_process") {
        toast({ title: "⏳ Pagamento pendente", description: "Siga as instruções para concluir." });
      } else {
        toast({ title: "Pagamento não aprovado", description: data.status_detail || "Tente novamente.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({ title: "Erro no pagamento", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }, [selectedPlan, user, payerEmail, docType, docNumber, payerFirstName, payerLastName, refreshPlan]);

  const handleCardPayment = useCallback(async () => {
    if (!mpInstance) {
      toast({ title: "SDK não carregado", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const [expMonth, expYear] = cardExpiry.split("/").map(s => s.trim());

      const tokenResponse = await mpInstance.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ""),
        cardholderName: cardHolder,
        cardExpirationMonth: expMonth,
        cardExpirationYear: expYear?.length === 2 ? `20${expYear}` : expYear,
        securityCode: cardCvc,
        identificationType: docType,
        identificationNumber: docNumber,
      });

      if (tokenResponse.error) {
        throw new Error("Erro ao tokenizar cartão. Verifique os dados.");
      }

      await processPayment("card", {
        token: tokenResponse.id,
        payment_method_id: tokenResponse.payment_method_id || "visa",
        installments,
      });
    } catch (err: any) {
      console.error("Card token error:", err);
      toast({ title: "Erro no cartão", description: err.message || "Verifique os dados do cartão.", variant: "destructive" });
      setProcessing(false);
    }
  }, [mpInstance, cardNumber, cardExpiry, cardCvc, cardHolder, docType, docNumber, installments, processPayment]);

  const handlePixPayment = () => processPayment("pix");
  const handleBoletoPayment = () => processPayment("boleto");

  const handleStartTrial = async () => {
    if (!user || !companyId) {
      toast({ title: "Faça login para continuar", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      const { error } = await supabase
        .from("companies")
        .update({
          plan_tier: selectedPlan,
          trial_ends_at: trialEnd.toISOString(),
        })
        .eq("id", companyId);

      if (error) throw error;

      trackEvent("started_trial", { plan: selectedPlan });
      toast({ title: "🎉 Teste grátis ativado!", description: `Você tem 7 dias para experimentar todos os recursos ${selectedPlan.toUpperCase()}.` });
      await refreshPlan();
      navigate("/");
    } catch (err: any) {
      console.error("Trial error:", err);
      toast({ title: "Erro ao ativar teste", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const selected = plans.find((p) => p.id === selectedPlan)!;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

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
            Compare os recursos e pague diretamente por aqui.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid gap-5 sm:grid-cols-2 mb-10">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const Icon = plan.icon;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative rounded-2xl border-2 p-6 text-left transition-all ${
                  isSelected ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card hover:border-muted-foreground/30"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[hsl(43,72%,50%)] to-[hsl(30,80%,45%)] px-3 py-0.5 text-xs font-bold text-white whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${plan.accent}20` }}>
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

        {/* Feature comparison */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-10">
          <div className="grid grid-cols-[1fr_80px_80px_80px] sm:grid-cols-[1fr_100px_100px_100px] text-center text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/50">
            <div className="p-3 text-left">Recurso</div>
            <div className="p-3">Free</div>
            <div className="p-3" style={{ color: "hsl(43,72%,50%)" }}>Pro</div>
            <div className="p-3" style={{ color: "hsl(270,60%,55%)" }}>Premium</div>
          </div>
          {features.map((f, i) => (
            <div key={f.label} className={`grid grid-cols-[1fr_80px_80px_80px] sm:grid-cols-[1fr_100px_100px_100px] items-center text-center ${i % 2 === 0 ? "bg-transparent" : "bg-muted/20"}`}>
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
          <p className="font-bold">Garantia de 7 dias</p>
          <p className="mt-1 text-sm text-muted-foreground">Cancele quando quiser. Sem compromisso.</p>
        </div>

        {/* Payment Result */}
        {paymentResult && (
          <PaymentResultView result={paymentResult} onCopy={copyToClipboard} />
        )}

        {/* Payment Methods */}
        {!paymentResult && (
          <div className="rounded-2xl border border-border bg-card p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">
              Pagamento — {selected.name} R$ {selected.price}/mês
            </h2>

            {loadingMp ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando métodos de pagamento...
              </div>
            ) : (
              <Tabs defaultValue="card">
                <TabsList className="w-full mb-6">
                  <TabsTrigger value="card" className="flex-1 gap-2">
                    <CreditCard className="h-4 w-4" /> Cartão
                  </TabsTrigger>
                  <TabsTrigger value="pix" className="flex-1 gap-2">
                    <QrCode className="h-4 w-4" /> Pix
                  </TabsTrigger>
                  <TabsTrigger value="boleto" className="flex-1 gap-2">
                    <FileText className="h-4 w-4" /> Boleto
                  </TabsTrigger>
                </TabsList>

                {/* CARD TAB */}
                <TabsContent value="card" className="space-y-4">
                  <div>
                    <Label>Número do cartão</Label>
                    <Input placeholder="0000 0000 0000 0000" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} maxLength={19} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Validade</Label>
                      <Input placeholder="MM/AA" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} maxLength={5} />
                    </div>
                    <div>
                      <Label>CVV</Label>
                      <Input placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} maxLength={4} type="password" />
                    </div>
                  </div>
                  <div>
                    <Label>Nome no cartão</Label>
                    <Input placeholder="NOME COMO ESTÁ NO CARTÃO" value={cardHolder} onChange={(e) => setCardHolder(e.target.value.toUpperCase())} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tipo de documento</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CPF">CPF</SelectItem>
                          <SelectItem value="CNPJ">CNPJ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nº do documento</Label>
                      <Input placeholder="000.000.000-00" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Parcelas</Label>
                    <Select value={String(installments)} onValueChange={(v) => setInstallments(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 6, 12].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}x de R$ {(selected.price / n).toFixed(2)}
                            {n === 1 ? " (à vista)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCardPayment}
                    disabled={processing || !cardNumber || !cardExpiry || !cardCvc || !cardHolder || !docNumber}
                    className="w-full h-12 rounded-xl text-base font-bold"
                    style={{ background: `linear-gradient(135deg, ${selected.accent}, ${selected.accent}cc)`, color: "white" }}
                  >
                    {processing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                    {processing ? "Processando..." : `Pagar R$ ${selected.price}`}
                  </Button>
                </TabsContent>

                {/* PIX TAB */}
                <TabsContent value="pix" className="space-y-4">
                  <div>
                    <Label>E-mail</Label>
                    <Input value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} placeholder="seu@email.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tipo de documento</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CPF">CPF</SelectItem>
                          <SelectItem value="CNPJ">CNPJ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nº do documento</Label>
                      <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="000.000.000-00" />
                    </div>
                  </div>
                  <Button
                    onClick={handlePixPayment}
                    disabled={processing || !payerEmail || !docNumber}
                    className="w-full h-12 rounded-xl text-base font-bold bg-[hsl(152,60%,40%)] hover:bg-[hsl(152,60%,35%)] text-white"
                  >
                    {processing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <QrCode className="mr-2 h-5 w-5" />}
                    {processing ? "Gerando Pix..." : `Gerar Pix — R$ ${selected.price}`}
                  </Button>
                </TabsContent>

                {/* BOLETO TAB */}
                <TabsContent value="boleto" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nome</Label>
                      <Input value={payerFirstName} onChange={(e) => setPayerFirstName(e.target.value)} placeholder="Nome" />
                    </div>
                    <div>
                      <Label>Sobrenome</Label>
                      <Input value={payerLastName} onChange={(e) => setPayerLastName(e.target.value)} placeholder="Sobrenome" />
                    </div>
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} placeholder="seu@email.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tipo de documento</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CPF">CPF</SelectItem>
                          <SelectItem value="CNPJ">CNPJ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nº do documento</Label>
                      <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="000.000.000-00" />
                    </div>
                  </div>
                  <Button
                    onClick={handleBoletoPayment}
                    disabled={processing || !payerEmail || !payerFirstName || !payerLastName || !docNumber}
                    className="w-full h-12 rounded-xl text-base font-bold bg-muted-foreground hover:bg-muted-foreground/90 text-background"
                  >
                    {processing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileText className="mr-2 h-5 w-5" />}
                    {processing ? "Gerando boleto..." : `Gerar Boleto — R$ ${selected.price}`}
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}

        {/* Trial button */}
        {canTrial && !paymentResult && (
          <Button
            onClick={handleStartTrial}
            disabled={processing}
            variant="outline"
            className="w-full h-12 rounded-2xl text-base font-semibold mt-4"
          >
            {processing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            Começar teste grátis de 7 dias
          </Button>
        )}

        {isTrialActive && (
          <p className="mt-3 text-center text-sm text-primary">✨ Seu teste está ativo!</p>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          Ao assinar, você concorda com os Termos de Uso e Política de Privacidade.
        </p>
      </div>
    </div>
  );
}

function PaymentResultView({ result, onCopy }: { result: any; onCopy: (text: string) => void }) {
  if (result.status === "approved") {
    return (
      <div className="rounded-2xl border-2 border-[hsl(152,60%,50%)] bg-[hsl(152,60%,50%)]/5 p-6 mb-6 text-center">
        <Check className="mx-auto mb-3 h-12 w-12 text-[hsl(152,60%,50%)]" />
        <h3 className="text-xl font-bold mb-1">Pagamento aprovado!</h3>
        <p className="text-muted-foreground">Seu plano será ativado automaticamente.</p>
      </div>
    );
  }

  if (result.payment_type === "pix" && result.pix_qr_code) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="text-center mb-4">
          <QrCode className="mx-auto mb-2 h-8 w-8 text-[hsl(152,60%,50%)]" />
          <h3 className="text-lg font-bold">Pague com Pix</h3>
          <p className="text-sm text-muted-foreground">Escaneie o QR code ou copie o código</p>
        </div>
        {result.pix_qr_code_base64 && (
          <div className="flex justify-center mb-4">
            <img src={`data:image/png;base64,${result.pix_qr_code_base64}`} alt="QR Code Pix" className="w-48 h-48 rounded-lg" />
          </div>
        )}
        <div className="relative">
          <Input value={result.pix_qr_code} readOnly className="pr-12 text-xs font-mono" />
          <button onClick={() => onCopy(result.pix_qr_code)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted">
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (result.payment_type === "boleto" && result.boleto_url) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 mb-6 text-center">
        <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <h3 className="text-lg font-bold mb-2">Boleto gerado!</h3>
        <p className="text-sm text-muted-foreground mb-4">Pague até a data de vencimento para ativar seu plano.</p>
        {result.barcode && (
          <div className="relative mb-4">
            <Input value={result.barcode} readOnly className="pr-12 text-xs font-mono" />
            <button onClick={() => onCopy(result.barcode)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        )}
        <Button onClick={() => window.open(result.boleto_url, "_blank")} variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" /> Abrir boleto
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 mb-6 text-center">
      <h3 className="text-lg font-bold mb-1">
        {result.status === "pending" || result.status === "in_process" ? "⏳ Pagamento pendente" : "Pagamento não aprovado"}
      </h3>
      <p className="text-sm text-muted-foreground">{result.status_detail}</p>
    </div>
  );
}

function CellIcon({ value }: { value: boolean }) {
  return (
    <div className="p-3 flex justify-center">
      {value ? <Check className="h-4 w-4 text-[hsl(152,60%,50%)]" /> : <X className="h-4 w-4 text-muted-foreground/30" />}
    </div>
  );
}
