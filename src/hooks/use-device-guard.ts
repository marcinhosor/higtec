import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyPlan, PlanTier } from "@/hooks/use-company-plan";

function getDeviceId(): string {
  const key = "hig_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function detectDeviceType(): "desktop" | "mobile" {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Mac/.test(ua)) return "Mac";
  if (/Linux/.test(ua)) return "Linux PC";
  return "Dispositivo";
}

interface DeviceLimits {
  desktop: number;
  mobile: number;
}

const PLAN_DEVICE_LIMITS: Record<PlanTier, DeviceLimits> = {
  free: { desktop: 1, mobile: 1 },
  pro: { desktop: 1, mobile: 2 },
  premium: { desktop: 1, mobile: 9 },
};

interface DeviceGuardResult {
  allowed: boolean;
  loading: boolean;
  deviceType: "desktop" | "mobile";
  currentCount: { desktop: number; mobile: number };
  limits: DeviceLimits;
  error: string | null;
}

export function useDeviceGuard(): DeviceGuardResult {
  const { user } = useAuth();
  const { planTier, companyId, loading: planLoading } = useCompanyPlan();
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentCount, setCurrentCount] = useState({ desktop: 0, mobile: 0 });
  const [limits, setLimits] = useState<DeviceLimits>(PLAN_DEVICE_LIMITS.free);
  const [error, setError] = useState<string | null>(null);

  const deviceType = detectDeviceType();
  const deviceId = getDeviceId();
  const deviceName = getDeviceName();

  const checkAndRegister = useCallback(async () => {
    if (!user || !companyId || planLoading) return;

    // Master admin (dev account) bypasses device limits
    try {
      const { data: isMaster } = await supabase.rpc("is_master_admin", { _user_id: user.id });
      if (isMaster) {
        setAllowed(true);
        setLoading(false);
        return;
      }
    } catch {}


    try {
      // Get company overrides
      const { data: company } = await supabase
        .from("companies")
        .select("max_desktop_devices, max_mobile_devices")
        .eq("id", companyId)
        .maybeSingle();

      const baseLimits = PLAN_DEVICE_LIMITS[planTier] || PLAN_DEVICE_LIMITS.free;
      const effectiveLimits: DeviceLimits = {
        desktop: (company as any)?.max_desktop_devices ?? baseLimits.desktop,
        mobile: (company as any)?.max_mobile_devices ?? baseLimits.mobile,
      };
      setLimits(effectiveLimits);

      // Upsert this device
      await supabase.from("device_sessions").upsert(
        {
          company_id: companyId,
          user_id: user.id,
          device_id: deviceId,
          device_type: deviceType,
          device_name: deviceName,
          last_active_at: new Date().toISOString(),
          is_active: true,
        } as any,
        { onConflict: "company_id,device_id" }
      );

      // Count active devices by type (active in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessions } = await supabase
        .from("device_sessions")
        .select("device_type, device_id")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .gte("last_active_at", thirtyDaysAgo.toISOString());

      if (sessions) {
        const desktopCount = sessions.filter(s => (s as any).device_type === "desktop").length;
        const mobileCount = sessions.filter(s => (s as any).device_type === "mobile").length;
        setCurrentCount({ desktop: desktopCount, mobile: mobileCount });

        // Check if THIS device type exceeds the limit
        const thisTypeCount = deviceType === "desktop" ? desktopCount : mobileCount;
        const thisTypeLimit = deviceType === "desktop" ? effectiveLimits.desktop : effectiveLimits.mobile;

        if (thisTypeCount > thisTypeLimit) {
          // Check if this specific device is among the oldest (allowed ones)
          const { data: typeDevices } = await supabase
            .from("device_sessions")
            .select("device_id, created_at")
            .eq("company_id", companyId)
            .eq("is_active", true)
            .eq("device_type", deviceType)
            .gte("last_active_at", thirtyDaysAgo.toISOString())
            .order("created_at", { ascending: true })
            .limit(thisTypeLimit);

          const allowedIds = (typeDevices || []).map(d => (d as any).device_id);
          if (!allowedIds.includes(deviceId)) {
            setAllowed(false);
            setError(
              deviceType === "desktop"
                ? `Limite de ${thisTypeLimit} computador(es) atingido para o plano ${planTier.toUpperCase()}.`
                : `Limite de ${thisTypeLimit} celular(es) atingido para o plano ${planTier.toUpperCase()}.`
            );
          } else {
            setAllowed(true);
            setError(null);
          }
        } else {
          setAllowed(true);
          setError(null);
        }
      }
    } catch (err) {
      console.error("Device guard error:", err);
      // On error, allow access to not lock users out
      setAllowed(true);
    } finally {
      setLoading(false);
    }
  }, [user, companyId, planTier, planLoading, deviceId, deviceType, deviceName]);

  useEffect(() => {
    checkAndRegister();
  }, [checkAndRegister]);

  return { allowed, loading: loading || planLoading, deviceType, currentCount, limits, error };
}
