import { useAuth } from "@/contexts/AuthContext";
import { useTechnician } from "@/contexts/TechnicianContext";
import { Navigate } from "react-router-dom";
import { useDeviceGuard } from "@/hooks/use-device-guard";
import { AlertTriangle, Monitor, Smartphone } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { isTechnician } = useTechnician();
  const { allowed, loading: deviceLoading, error, deviceType, currentCount, limits } = useDeviceGuard();

  if (loading || deviceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Allow if either admin session or technician session exists
  if (!session && !isTechnician) {
    return <Navigate to="/login" replace />;
  }

  // Device limit check (only for authenticated users, not technicians)
  if (session && !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl bg-card border p-6 space-y-4 text-center shadow-lg">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Limite de Dispositivos</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><Monitor className="h-4 w-4" /> Computadores</span>
              <span className="font-medium text-foreground">{currentCount.desktop}/{limits.desktop}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><Smartphone className="h-4 w-4" /> Celulares</span>
              <span className="font-medium text-foreground">{currentCount.mobile}/{limits.mobile}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {deviceType === "desktop" ? "Este computador" : "Este celular"} excede o limite do seu plano. 
            Peça ao administrador para revogar um dispositivo nas Configurações ou entre em contato com o suporte para liberar mais dispositivos.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
