import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft } from "lucide-react";
import logoApp from "@/assets/logo_app.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md shadow-card text-center">
          <CardHeader>
            <img src={logoApp} alt="Logo" className="h-16 mx-auto" />
            <CardTitle className="text-xl font-bold text-foreground">E-mail enviado</CardTitle>
            <CardDescription className="text-muted-foreground">
              Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link to="/login"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao login</Button></Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center space-y-3">
          <img src={logoApp} alt="Logo" className="h-16 mx-auto" />
          <CardTitle className="text-xl font-bold text-foreground">Esqueci minha senha</CardTitle>
          <CardDescription className="text-muted-foreground">
            Informe seu e-mail para receber o link de redefinição
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              <Mail className="mr-2 h-4 w-4" />
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="inline h-3 w-3 mr-1" /> Voltar ao login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
