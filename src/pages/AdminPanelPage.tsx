import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Webhook, CreditCard, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminPanelPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [webhookStatus, setWebhookStatus] = useState<"unknown" | "configured" | "pending">("unknown");

  useEffect(() => {
    if (!user) return;
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => {
        setIsAdmin(!!data);
        setLoading(false);
        if (!data) {
          toast.error("Acesso restrito a administradores");
          navigate("/");
        }
      });
  }, [user, navigate]);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/mercadopago-webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL do webhook copiada!");
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Configuracoes globais do sistema</p>
          </div>
          <Badge variant="outline" className="ml-auto">Admin</Badge>
        </div>

        {/* Mercado Pago Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Mercado Pago</CardTitle>
            </div>
            <CardDescription>Gateway de pagamento para assinaturas e cobranças</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Credenciais configuradas com seguranca no servidor</span>
            </div>

            {/* Webhook Configuration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Configuracao do Webhook</h3>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Para receber notificacoes de pagamento em tempo real, configure o webhook no painel do Mercado Pago:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Acesse <strong>Suas integracoes</strong> no painel do Mercado Pago</li>
                  <li>Selecione sua aplicacao e va em <strong>Webhooks</strong></li>
                  <li>Adicione a URL abaixo como URL de notificacao</li>
                  <li>Selecione os eventos: <strong>payment</strong></li>
                </ol>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                <code className="flex-1 text-xs break-all font-mono text-foreground">
                  {webhookUrl}
                </code>
                <Button size="sm" variant="outline" onClick={copyWebhookUrl}>
                  Copiar
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open("https://www.mercadopago.com.br/developers/panel/app", "_blank")}
              >
                <ExternalLink className="h-3 w-3" />
                Abrir painel Mercado Pago
              </Button>
            </div>

            {/* Instructions */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Credenciais necessarias
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="p-3 rounded-lg border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Access Token</p>
                  <p className="text-xs text-muted-foreground">
                    Token privado para processar pagamentos. Encontre em: Suas integracoes &gt; Credenciais de producao
                  </p>
                  <Badge variant="secondary" className="mt-2 text-xs">Configurado</Badge>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Public Key</p>
                  <p className="text-xs text-muted-foreground">
                    Chave publica para o checkout. Encontre em: Suas integracoes &gt; Credenciais de producao
                  </p>
                  <Badge variant="secondary" className="mt-2 text-xs">Configurado</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate("/")}>
          Voltar ao inicio
        </Button>
      </div>
    </div>
  );
}
