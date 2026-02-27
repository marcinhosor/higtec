import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Shield, Webhook, CreditCard, ExternalLink, CheckCircle, AlertCircle,
  Users, Building2, Search, RefreshCw, Crown, Eye, Lock, KeyRound, Save,
} from "lucide-react";
import { toast } from "sonner";

interface CompanyRow {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  plan_tier: string;
  created_at: string;
  updated_at: string;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  company_id: string;
  profile?: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  company?: {
    name: string;
  };
}

export default function AdminPanelPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Password gate states
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Data states
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchCompany, setSearchCompany] = useState("");
  const [searchMember, setSearchMember] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);

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

  // Check if admin password exists
  useEffect(() => {
    if (!isAdmin) return;
    supabase.rpc("has_admin_password").then(({ data }) => {
      setHasPassword(!!data);
      if (!data) setIsUnlocked(true); // No password set yet, allow access to set one
    });
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && isUnlocked) loadAllData();
  }, [isAdmin, isUnlocked]);

  const handleVerifyPassword = async () => {
    if (!passwordInput.trim()) return;
    setVerifyingPassword(true);
    const { data, error } = await supabase.rpc("verify_admin_password", { _password: passwordInput });
    if (error || !data) {
      toast.error("Senha incorreta");
    } else {
      setIsUnlocked(true);
      toast.success("Acesso liberado");
    }
    setPasswordInput("");
    setVerifyingPassword(false);
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSettingPassword(true);
    const { data, error } = await supabase.rpc("set_admin_password", { _password: newPassword });
    if (error || !data) {
      toast.error("Erro ao definir senha");
    } else {
      toast.success("Senha do painel admin definida com sucesso!");
      setHasPassword(true);
      setNewPassword("");
      setConfirmPassword("");
      setShowChangePassword(false);
    }
    setSettingPassword(false);
  };

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const [companiesRes, membersRes] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("company_memberships").select("*, profiles:user_id(full_name, phone, avatar_url)").order("created_at", { ascending: false }),
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data as CompanyRow[]);
      if (membersRes.data) {
        // Map the joined data
        const mapped = (membersRes.data as any[]).map((m) => ({
          ...m,
          profile: m.profiles || null,
        }));
        setMembers(mapped);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
      toast.error("Erro ao carregar dados");
    }
    setLoadingData(false);
  };

  // Mercado Pago credentials state
  const [mpAccessToken, setMpAccessToken] = useState("");
  const [mpPublicKey, setMpPublicKey] = useState("");
  const [mpAccessTokenPreview, setMpAccessTokenPreview] = useState("");
  const [mpPublicKeyPreview, setMpPublicKeyPreview] = useState("");
  const [mpAccessTokenSet, setMpAccessTokenSet] = useState(false);
  const [mpPublicKeySet, setMpPublicKeySet] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/mercadopago-webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL do webhook copiada!");
  };

  // Load current credential status
  useEffect(() => {
    if (!isAdmin) return;
    supabase.functions
      .invoke("update-mp-credentials", { body: { action: "get" } })
      .then(({ data, error }) => {
        if (data && !error) {
          setMpAccessTokenSet(data.access_token_set);
          setMpAccessTokenPreview(data.access_token_preview || "");
          setMpPublicKeySet(data.public_key_set);
          setMpPublicKeyPreview(data.public_key_preview || "");
        }
      });
  }, [isAdmin]);

  const validateCredentials = async () => {
    if (!mpAccessToken && !mpPublicKey) {
      toast.error("Preencha pelo menos um campo");
      return;
    }
    setSavingCredentials(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-mp-credentials", {
        body: {
          access_token: mpAccessToken || undefined,
          public_key: mpPublicKey || undefined,
        },
      });
      if (error) {
        toast.error("Erro ao validar credenciais");
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("Credenciais validadas! Atualize os segredos no painel do Lovable Cloud.");
        setMpAccessToken("");
        setMpPublicKey("");
      }
    } catch {
      toast.error("Erro ao validar credenciais");
    }
    setSavingCredentials(false);
  };

  const filteredCompanies = companies.filter((c) => {
    const q = searchCompany.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.cnpj || "").includes(q) ||
      (c.city || "").toLowerCase().includes(q)
    );
  });

  const filteredMembers = members.filter((m) => {
    const q = searchMember.toLowerCase();
    return (
      (m.profile?.full_name || "").toLowerCase().includes(q) ||
      (m.profile?.phone || "").includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  const companyMembers = selectedCompany
    ? members.filter((m) => m.company_id === selectedCompany.id)
    : [];

  const planStats = {
    free: companies.filter((c) => c.plan_tier === "free").length,
    pro: companies.filter((c) => c.plan_tier === "pro").length,
    premium: companies.filter((c) => c.plan_tier === "premium").length,
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const getPlanBadge = (tier: string) => {
    const variants: Record<string, string> = {
      free: "bg-muted text-muted-foreground",
      pro: "bg-primary/10 text-primary",
      premium: "bg-accent text-accent-foreground",
    };
    return (
      <Badge className={variants[tier] || variants.free}>
        {tier.toUpperCase()}
      </Badge>
    );
  };

  if (loading || !isAdmin || hasPassword === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Password gate - if password exists and not unlocked
  if (hasPassword && !isUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Painel Administrativo</CardTitle>
            <CardDescription>Digite a senha de acesso para continuar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Senha do painel admin"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
            />
            <Button
              className="w-full gap-2"
              onClick={handleVerifyPassword}
              disabled={verifyingPassword || !passwordInput.trim()}
            >
              {verifyingPassword ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Desbloquear
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // First-time setup - no password set yet
  if (!hasPassword && isUnlocked) {
    // Show setup inline - will render main panel with setup banner
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Visão geral de todas as empresas e usuários</p>
          </div>
          <Badge variant="outline" className="ml-auto">Admin</Badge>
        </div>

        {/* Password Setup Banner */}
        {!hasPassword && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-foreground">Defina uma senha para o painel admin</p>
                    <p className="text-sm text-muted-foreground">
                      Proteja o acesso ao painel com uma senha exclusiva. Sem ela, qualquer admin poderá acessar.
                    </p>
                  </div>
                  <div className="grid gap-2 max-w-sm">
                    <Input
                      type="password"
                      placeholder="Nova senha (mín. 6 caracteres)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="Confirmar senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <Button onClick={handleSetPassword} disabled={settingPassword} className="gap-2">
                      {settingPassword ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Definir Senha
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Change Password Toggle */}
        {hasPassword && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowChangePassword(!showChangePassword)}>
              <KeyRound className="h-3 w-3" />
              {showChangePassword ? "Cancelar" : "Alterar Senha Admin"}
            </Button>
          </div>
        )}

        {showChangePassword && hasPassword && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Alterar Senha do Painel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 max-w-sm">
                <Input
                  type="password"
                  placeholder="Nova senha (mín. 6 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Button onClick={handleSetPassword} disabled={settingPassword} className="gap-2">
                  {settingPassword ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Nova Senha
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Empresas</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{companies.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Usuários</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{members.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">PRO</span>
              </div>
              <p className="text-2xl font-bold text-primary mt-1">{planStats.pro}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-accent-foreground" />
                <span className="text-xs text-muted-foreground">Premium</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{planStats.premium}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="companies" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="companies">Empresas</TabsTrigger>
            <TabsTrigger value="members">Usuários</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          </TabsList>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresa por nome, email, CNPJ ou cidade..."
                  value={searchCompany}
                  onChange={(e) => setSearchCompany(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" onClick={loadAllData} disabled={loadingData}>
                <RefreshCw className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="hidden md:table-cell">Cidade/UF</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {loadingData ? "Carregando..." : "Nenhuma empresa encontrada"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCompanies.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{c.name}</p>
                              {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                              {c.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {c.cnpj}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {[c.city, c.state].filter(Boolean).join("/") || "—"}
                          </TableCell>
                          <TableCell>{getPlanBadge(c.plan_tier)}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {formatDate(c.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCompany(selectedCompany?.id === c.id ? null : c)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Company Detail */}
            {selectedCompany && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedCompany.name}</CardTitle>
                  <CardDescription>Detalhes da empresa e membros</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">CNPJ</p>
                      <p className="font-medium text-foreground">{selectedCompany.cnpj || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground">{selectedCompany.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Telefone</p>
                      <p className="font-medium text-foreground">{selectedCompany.phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cidade/UF</p>
                      <p className="font-medium text-foreground">
                        {[selectedCompany.city, selectedCompany.state].filter(Boolean).join("/") || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Plano</p>
                      {getPlanBadge(selectedCompany.plan_tier)}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cadastro</p>
                      <p className="font-medium text-foreground">{formatDate(selectedCompany.created_at)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Membros ({companyMembers.length})</h4>
                    {companyMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum membro encontrado</p>
                    ) : (
                      <div className="space-y-2">
                        {companyMembers.map((m) => (
                          <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm text-foreground">
                                {m.profile?.full_name || "Sem nome"}
                              </p>
                              <p className="text-xs text-muted-foreground">{m.profile?.phone || "—"}</p>
                            </div>
                            <Badge variant="outline">{m.role}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário por nome, telefone ou role..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="pl-10"
              />
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Telefone</TableHead>
                      <TableHead className="hidden md:table-cell">Desde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <p className="font-medium text-foreground">{m.profile?.full_name || "Sem nome"}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{m.role}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {m.profile?.phone || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {formatDate(m.created_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <CardTitle>Mercado Pago</CardTitle>
                </div>
                <CardDescription>Gateway de pagamento para assinaturas e cobrançass</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Credenciais configuradas com segurança no servidor</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">Configuração do Webhook</h3>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Para receber notificações de pagamento em tempo real:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Acesse <strong>Suas integrações</strong> no painel do Mercado Pago</li>
                      <li>Selecione sua aplicação e vá em <strong>Webhooks</strong></li>
                      <li>Adicione a URL abaixo como URL de notificação</li>
                      <li>Selecione os eventos: <strong>payment</strong></li>
                    </ol>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                    <code className="flex-1 text-xs break-all font-mono text-foreground">{webhookUrl}</code>
                    <Button size="sm" variant="outline" onClick={copyWebhookUrl}>Copiar</Button>
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

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    Credenciais do Gateway
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Encontre suas credenciais em{" "}
                    <a
                      href="https://www.mercadopago.com.br/developers/panel/app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Suas integrações → Credenciais
                    </a>
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Access Token */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Access Token (Secret)</label>
                      {mpAccessTokenSet && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Atual: {mpAccessTokenPreview}
                        </p>
                      )}
                      <Input
                        type="password"
                        placeholder="APP_USR-..."
                        value={mpAccessToken}
                        onChange={(e) => setMpAccessToken(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Token privado para processar pagamentos</p>
                      {mpAccessTokenSet ? (
                        <Badge variant="secondary" className="text-xs">✓ Configurado</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Não configurado</Badge>
                      )}
                    </div>

                    {/* Public Key */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Public Key</label>
                      {mpPublicKeySet && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Atual: {mpPublicKeyPreview}
                        </p>
                      )}
                      <Input
                        placeholder="APP_USR-..."
                        value={mpPublicKey}
                        onChange={(e) => setMpPublicKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Chave pública para o checkout</p>
                      {mpPublicKeySet ? (
                        <Badge variant="secondary" className="text-xs">✓ Configurado</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Não configurado</Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={validateCredentials}
                    disabled={savingCredentials || (!mpAccessToken && !mpPublicKey)}
                    className="gap-2"
                  >
                    {savingCredentials ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Validar Credenciais
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Button variant="ghost" onClick={() => navigate("/")}>
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}
