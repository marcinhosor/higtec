import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyPlan } from "@/hooks/use-company-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Navigation, Clock, Fuel, AlertTriangle, Plus, CheckCircle, Play, Square, Crown } from "lucide-react";
import ProUpgradeModal from "@/components/ProUpgradeModal";

interface Vehicle {
  id: string;
  model: string;
  plate: string;
  fuel_type: string;
  avg_consumption_km_l: number;
  fuel_price_per_liter: number;
  collaborator_id: string | null;
}

interface Trip {
  id: string;
  vehicle_id: string;
  collaborator_id: string | null;
  origin_address: string;
  destination_address: string;
  estimated_distance_km: number;
  actual_distance_km: number;
  estimated_cost: number;
  actual_cost: number;
  checkin_at: string | null;
  checkout_at: string | null;
  checkin_lat: number | null;
  checkin_lng: number | null;
  checkout_lat: number | null;
  checkout_lng: number | null;
  route_deviation: boolean;
  deviation_details: string;
  status: string;
  created_at: string;
}

interface Collaborator {
  id: string;
  name: string;
}

export default function VehicleTripsPage() {
  const { user } = useAuth();
  const { planTier } = useCompanyPlan();
  const isPremium = planTier === "premium";
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);

  // Trip form
  const [tripOpen, setTripOpen] = useState(false);
  const [tripForm, setTripForm] = useState({
    vehicle_id: "",
    collaborator_id: "",
    origin_address: "",
    destination_address: "",
    estimated_distance_km: 0,
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).maybeSingle();
    if (!profile?.company_id) { setLoading(false); return; }
    setCompanyId(profile.company_id);

    const [vRes, tRes, cRes] = await Promise.all([
      supabase.from("vehicles").select("*").eq("company_id", profile.company_id),
      supabase.from("vehicle_trips").select("*").eq("company_id", profile.company_id).order("created_at", { ascending: false }).limit(50),
      supabase.from("collaborators").select("id, name").eq("company_id", profile.company_id).eq("status", "ativo"),
    ]);
    if (vRes.data) setVehicles(vRes.data as Vehicle[]);
    if (tRes.data) setTrips(tRes.data as Trip[]);
    if (cRes.data) setCollaborators(cRes.data as Collaborator[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const getVehicle = (id: string) => vehicles.find(v => v.id === id);
  const getCollabName = (id: string | null) => collaborators.find(c => c.id === id)?.name || "—";

  const estimateCost = (distKm: number, vehicleId: string) => {
    const v = getVehicle(vehicleId);
    if (!v || v.avg_consumption_km_l <= 0) return 0;
    return (distKm / v.avg_consumption_km_l) * v.fuel_price_per_liter;
  };

  const createTrip = async () => {
    if (!companyId || !tripForm.vehicle_id) { toast.error("Selecione um veículo"); return; }
    const cost = estimateCost(tripForm.estimated_distance_km, tripForm.vehicle_id);
    const { data, error } = await supabase.from("vehicle_trips").insert({
      company_id: companyId,
      vehicle_id: tripForm.vehicle_id,
      collaborator_id: tripForm.collaborator_id || null,
      origin_address: tripForm.origin_address,
      destination_address: tripForm.destination_address,
      estimated_distance_km: tripForm.estimated_distance_km,
      estimated_cost: cost,
      status: "planned",
    } as any).select().single();
    if (error) { toast.error("Erro ao criar viagem"); return; }
    setTrips(prev => [data as Trip, ...prev]);
    setTripOpen(false);
    setTripForm({ vehicle_id: "", collaborator_id: "", origin_address: "", destination_address: "", estimated_distance_km: 0 });
    toast.success("Viagem planejada!");
  };

  const doCheckin = async (tripId: string) => {
    if (!navigator.geolocation) { toast.error("GPS não disponível"); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { error } = await supabase.from("vehicle_trips").update({
        checkin_at: new Date().toISOString(),
        checkin_lat: pos.coords.latitude,
        checkin_lng: pos.coords.longitude,
        status: "in_progress",
      } as any).eq("id", tripId);
      if (error) { toast.error("Erro no check-in"); return; }
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, checkin_at: new Date().toISOString(), checkin_lat: pos.coords.latitude, checkin_lng: pos.coords.longitude, status: "in_progress" } : t));
      toast.success("Check-in registrado!");
    }, () => toast.error("Permissão de localização negada"));
  };

  const doCheckout = async (tripId: string) => {
    if (!navigator.geolocation) { toast.error("GPS não disponível"); return; }
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      // Calculate actual distance (straight line approximation)
      let actualDist = 0;
      let deviation = false;
      let devDetails = "";
      if (trip.checkin_lat && trip.checkin_lng) {
        const R = 6371;
        const dLat = (pos.coords.latitude - trip.checkin_lat) * Math.PI / 180;
        const dLng = (pos.coords.longitude - trip.checkin_lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(trip.checkin_lat * Math.PI / 180) * Math.cos(pos.coords.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        actualDist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        // Check deviation: if actual > estimated * 1.3 (30% tolerance)
        if (trip.estimated_distance_km > 0 && actualDist > trip.estimated_distance_km * 1.3) {
          deviation = true;
          devDetails = `Distância real (${actualDist.toFixed(1)}km) excede estimativa (${trip.estimated_distance_km}km) em ${((actualDist / trip.estimated_distance_km - 1) * 100).toFixed(0)}%`;
        }
      }
      const v = getVehicle(trip.vehicle_id);
      const actualCost = v && v.avg_consumption_km_l > 0 ? (actualDist / v.avg_consumption_km_l) * v.fuel_price_per_liter : 0;

      const { error } = await supabase.from("vehicle_trips").update({
        checkout_at: new Date().toISOString(),
        checkout_lat: pos.coords.latitude,
        checkout_lng: pos.coords.longitude,
        actual_distance_km: actualDist,
        actual_cost: actualCost,
        route_deviation: deviation,
        deviation_details: devDetails,
        status: "completed",
      } as any).eq("id", tripId);
      if (error) { toast.error("Erro no check-out"); return; }
      setTrips(prev => prev.map(t => t.id === tripId ? {
        ...t, checkout_at: new Date().toISOString(), checkout_lat: pos.coords.latitude, checkout_lng: pos.coords.longitude,
        actual_distance_km: actualDist, actual_cost: actualCost, route_deviation: deviation, deviation_details: devDetails, status: "completed",
      } : t));
      if (deviation) {
        toast.warning("⚠️ Desvio de rota detectado!");
      } else {
        toast.success("Check-out registrado!");
      }
    }, () => toast.error("Permissão de localização negada"));
  };

  if (!isPremium) {
    return (
      <PageShell title="Deslocamentos" showBack>
        <div className="mx-auto max-w-md text-center py-16 px-4 space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/10">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Gestão de Deslocamentos</h2>
          <p className="text-sm text-muted-foreground">
            Controle de veículos, rotas e custos de deslocamento disponível no plano <span className="font-semibold text-primary">PREMIUM</span>.
          </p>
          <ProUpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} feature="Gestão de Deslocamentos" />
        </div>
      </PageShell>
    );
  }

  if (loading) {
    return <PageShell title="Deslocamentos" showBack><div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Carregando...</p></div></PageShell>;
  }

  return (
    <PageShell title="Deslocamentos" showBack>
      <div className="mx-auto max-w-md space-y-4 pb-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Veículos</p><p className="text-lg font-bold text-foreground">{vehicles.length}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Viagens</p><p className="text-lg font-bold text-foreground">{trips.length}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Desvios</p><p className="text-lg font-bold text-destructive">{trips.filter(t => t.route_deviation).length}</p></CardContent></Card>
        </div>

        {/* New Trip */}
        <Dialog open={tripOpen} onOpenChange={setTripOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-full gap-2"><Plus className="h-4 w-4" /> Nova Viagem</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Planejar Viagem</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Veículo *</Label>
                <Select value={tripForm.vehicle_id} onValueChange={v => setTripForm({ ...tripForm, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.model} — {v.plate}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Colaborador</Label>
                <Select value={tripForm.collaborator_id} onValueChange={v => setTripForm({ ...tripForm, collaborator_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Origem</Label><Input value={tripForm.origin_address} onChange={e => setTripForm({ ...tripForm, origin_address: e.target.value })} placeholder="Endereço de saída" /></div>
              <div><Label>Destino</Label><Input value={tripForm.destination_address} onChange={e => setTripForm({ ...tripForm, destination_address: e.target.value })} placeholder="Endereço de destino" /></div>
              <div>
                <Label>Distância estimada (km)</Label>
                <Input type="number" min={0} step={0.1} value={tripForm.estimated_distance_km || ""} onChange={e => setTripForm({ ...tripForm, estimated_distance_km: parseFloat(e.target.value) || 0 })} />
              </div>
              {tripForm.vehicle_id && tripForm.estimated_distance_km > 0 && (
                <div className="rounded-lg bg-accent/50 p-3 text-sm">
                  <p className="text-muted-foreground">Custo estimado: <span className="font-bold text-foreground">R$ {estimateCost(tripForm.estimated_distance_km, tripForm.vehicle_id).toFixed(2)}</span></p>
                </div>
              )}
              <Button onClick={createTrip} className="w-full rounded-full">Criar Viagem</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Trips List */}
        {trips.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma viagem registrada. Cadastre veículos nas Configurações e crie viagens aqui.</p>
        ) : (
          <div className="space-y-3">
            {trips.map(trip => {
              const v = getVehicle(trip.vehicle_id);
              return (
                <Card key={trip.id} className={trip.route_deviation ? "border-destructive/40" : ""}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm text-foreground">{v?.model || "—"} ({v?.plate || "—"})</span>
                      </div>
                      <Badge variant={trip.status === "completed" ? "default" : trip.status === "in_progress" ? "secondary" : "outline"} className="text-xs">
                        {trip.status === "planned" && "Planejada"}
                        {trip.status === "in_progress" && "Em andamento"}
                        {trip.status === "completed" && "Concluída"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {trip.collaborator_id && <p>👤 {getCollabName(trip.collaborator_id)}</p>}
                      {trip.origin_address && <p>📍 De: {trip.origin_address}</p>}
                      {trip.destination_address && <p>📍 Para: {trip.destination_address}</p>}
                      <div className="flex gap-3">
                        <span>Est: {trip.estimated_distance_km?.toFixed(1)}km</span>
                        {trip.actual_distance_km > 0 && <span>Real: {trip.actual_distance_km.toFixed(1)}km</span>}
                      </div>
                      <div className="flex gap-3">
                        <span>Custo est: R$ {(trip.estimated_cost || 0).toFixed(2)}</span>
                        {trip.actual_cost > 0 && <span className="font-medium text-foreground">Real: R$ {trip.actual_cost.toFixed(2)}</span>}
                      </div>
                    </div>
                    {trip.route_deviation && (
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{trip.deviation_details || "Desvio de rota detectado"}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {trip.status === "planned" && (
                        <Button size="sm" className="flex-1 rounded-full gap-1" onClick={() => doCheckin(trip.id)}>
                          <Play className="h-3 w-3" /> Check-in
                        </Button>
                      )}
                      {trip.status === "in_progress" && (
                        <Button size="sm" className="flex-1 rounded-full gap-1" variant="secondary" onClick={() => doCheckout(trip.id)}>
                          <Square className="h-3 w-3" /> Check-out
                        </Button>
                      )}
                      {trip.status === "completed" && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <CheckCircle className="h-3 w-3" /> Concluída
                        </div>
                      )}
                      {(trip.origin_address || trip.destination_address) && (
                        <Button size="sm" variant="outline" className="rounded-full gap-1" onClick={() => {
                          const origin = trip.origin_address ? encodeURIComponent(trip.origin_address) : "";
                          const dest = trip.destination_address ? encodeURIComponent(trip.destination_address) : "";
                          window.open(`https://www.google.com/maps/dir/${origin}/${dest}`, "_blank");
                        }}>
                          <MapPin className="h-3 w-3" /> Rota
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
