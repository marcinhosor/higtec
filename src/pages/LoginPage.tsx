import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Eye, EyeOff, Wrench, Building2 } from "lucide-react";
import { useTechnician } from "@/contexts/TechnicianContext";
import logoApp from "@/assets/logo_app.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginTechnician } = useTechnician();

  // Technician login state
  const [techCode, setTechCode] = useState("");
  const [techList, setTechList] = useState<{ id: string; name: string }[]>([]);
  const [selectedTechId, setSelectedTechId] = useState("");
  const [techPin, setTechPin] = useState("");
  const [techLoading, setTechLoading] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message === "Email not confirmed"
          ? "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada."
          : error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
    }

    setLoading(false);
  };

  const handleVerifyCode = async () => {
    if (techCode.trim().length < 4) {
      toast({ title: "Código inválido", description: "Digite o código de acesso da empresa.", variant: "destructive" });
      return;
    }
    setTechLoading(true);
    const { data, error } = await supabase.rpc("get_technicians_by_code", { _code: techCode.trim() });
    
    if (error || !data || (data as any[]).length === 0) {
      toast({ title: "Código não encontrado", description: "Verifique o código com o administrador da empresa.", variant: "destructive" });
      setTechLoading(false);
      return;
    }
    
    setTechList(data as { id: string; name: string }[]);
    setCodeVerified(true);
    setTechLoading(false);
  };

  const handleTechLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId || techPin.length < 4) {
      toast({ title: "Dados incompletos", description: "Selecione seu nome e digite o PIN.", variant: "destructive" });
      return;
    }
    setTechLoading(true);

    const { data, error } = await supabase.rpc("technician_login", {
      _code: techCode.trim(),
      _technician_id: selectedTechId,
      _pin: techPin,
    });

    const result = data as any;
    if (error || !result?.success) {
      toast({ title: "Erro ao entrar", description: result?.error || "PIN incorreto.", variant: "destructive" });
      setTechLoading(false);
      return;
    }

    loginTechnician({
      technician_id: result.technician_id,
      technician_name: result.technician_name,
      company_id: result.company_id,
      company_name: result.company_name,
    });
    navigate("/orcamentos");
    setTechLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center space-y-3">
          <img src={logoApp} alt="Logo" className="h-16 mx-auto" />
          <CardTitle className="text-2xl font-bold text-foreground">Entrar</CardTitle>
          <CardDescription className="text-muted-foreground">
            Acesse sua conta para continuar
          </CardDescription>
        </CardHeader>

        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mx-0">
            <TabsTrigger value="admin" className="gap-1.5">
              <Building2 className="h-4 w-4" /> Empresa
            </TabsTrigger>
            <TabsTrigger value="technician" className="gap-1.5">
              <Wrench className="h-4 w-4" /> Técnico
            </TabsTrigger>
          </TabsList>

          {/* Admin / Owner login */}
          <TabsContent value="admin">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <Link to="/esqueci-senha" className="text-sm text-primary hover:underline">Esqueci minha senha</Link>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Não tem conta?{" "}
                  <Link to="/cadastro" className="text-primary font-medium hover:underline">Cadastre-se</Link>
                </p>
              </CardFooter>
            </form>
          </TabsContent>

          {/* Technician login */}
          <TabsContent value="technician">
            <form onSubmit={handleTechLogin}>
              <CardContent className="space-y-4 pt-4">
                {!codeVerified ? (
                  <>
                    <div className="space-y-2">
                      <Label>Código da Empresa</Label>
                      <Input
                        placeholder="Ex: A1B2C3"
                        value={techCode}
                        onChange={(e) => setTechCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="text-center text-lg tracking-widest font-mono"
                      />
                      <p className="text-xs text-muted-foreground">Peça o código para o administrador da empresa.</p>
                    </div>
                    <Button type="button" onClick={handleVerifyCode} className="w-full" disabled={techLoading}>
                      {techLoading ? "Verificando..." : "Verificar Código"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg bg-accent/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Empresa</p>
                      <p className="font-medium text-foreground">Código: {techCode}</p>
                      <button type="button" className="text-xs text-primary hover:underline mt-1" onClick={() => { setCodeVerified(false); setTechList([]); setSelectedTechId(""); setTechPin(""); }}>
                        Trocar código
                      </button>
                    </div>
                    <div className="space-y-2">
                      <Label>Seu Nome</Label>
                      <Select value={selectedTechId} onValueChange={setSelectedTechId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione seu nome" />
                        </SelectTrigger>
                        <SelectContent>
                          {techList.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>PIN (4 dígitos)</Label>
                      <Input
                        type="password"
                        placeholder="••••"
                        value={techPin}
                        onChange={(e) => setTechPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        maxLength={4}
                        className="text-center text-lg tracking-widest font-mono"
                        inputMode="numeric"
                      />
                    </div>
                  </>
                )}
              </CardContent>
              {codeVerified && (
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={techLoading}>
                    <Wrench className="mr-2 h-4 w-4" />
                    {techLoading ? "Entrando..." : "Entrar como Técnico"}
                  </Button>
                </CardFooter>
              )}
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
