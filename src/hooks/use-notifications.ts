import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyPlan } from "./use-company-plan";

export interface AppNotification {
  id: string;
  company_id: string;
  type: string;
  title: string;
  message: string;
  level: string;
  entity_id: string | null;
  entity_type: string | null;
  read: boolean;
  dismissed: boolean;
  whatsapp_sent: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const { companyId } = useCompanyPlan();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      setNotifications(data as unknown as AppNotification[]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const activeNotifications = notifications.filter(n => !n.dismissed);
  const unreadCount = notifications.filter(n => !n.read && !n.dismissed).length;

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const dismiss = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ dismissed: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
  }, []);

  const dismissAll = useCallback(async () => {
    if (!companyId) return;
    await supabase
      .from("notifications")
      .update({ dismissed: true })
      .eq("company_id", companyId)
      .eq("dismissed", false);
    setNotifications(prev => prev.map(n => ({ ...n, dismissed: true })));
  }, [companyId]);

  const markAllAsRead = useCallback(async () => {
    if (!companyId) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("company_id", companyId)
      .eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [companyId]);

  const markWhatsAppSent = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ whatsapp_sent: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, whatsapp_sent: true } : n));
  }, []);

  /** Generate notifications from current data and save new ones to DB */
  const syncNotifications = useCallback(async () => {
    if (!companyId) return;

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const newNotifs: Omit<AppNotification, "id" | "created_at" | "read" | "dismissed" | "whatsapp_sent">[] = [];

    // 1. Appointments today/tomorrow
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .in("date", [today, tomorrowStr]);

    appointments?.forEach(a => {
      const isToday = a.date === today;
      newNotifs.push({
        company_id: companyId,
        type: "appointment",
        title: isToday ? "📅 Agendamento hoje" : "📅 Agendamento amanhã",
        message: `${a.client_name} — ${a.service || "Serviço"}${a.time ? ` às ${a.time}` : ""}`,
        level: isToday ? "warning" : "info",
        entity_id: a.id,
        entity_type: "appointment",
      });
    });

    // 2. Client maintenance (5+ months)
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, service_history, created_at")
      .eq("company_id", companyId);

    clients?.forEach(client => {
      const history = (client.service_history as any[]) || [];
      let refDate: string;
      if (history.length > 0) {
        const last = history.reduce((l: any, s: any) => new Date(s.date) > new Date(l.date) ? s : l, history[0]);
        refDate = last.date;
      } else {
        refDate = client.created_at;
      }
      if (!refDate) return;
      const d = new Date(refDate);
      if (isNaN(d.getTime())) return;
      const months = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      if (months >= 5) {
        newNotifs.push({
          company_id: companyId,
          type: "maintenance_client",
          title: months >= 6 ? "⚠️ Manutenção urgente" : "🔔 Manutenção próxima",
          message: `${client.name} — ${Math.floor(months)} meses sem higienização`,
          level: months >= 6 ? "urgent" : "warning",
          entity_id: client.id,
          entity_type: "client",
        });
      }
    });

    // 3. Equipment maintenance
    const { data: equipment } = await supabase
      .from("equipment")
      .select("id, name, next_maintenance_date, status")
      .eq("company_id", companyId)
      .neq("status", "inativo");

    equipment?.filter(eq => eq.next_maintenance_date).forEach(eq => {
      const next = new Date(eq.next_maintenance_date!);
      const diffDays = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        newNotifs.push({
          company_id: companyId,
          type: "maintenance_equipment",
          title: diffDays < 0 ? "🔴 Manutenção atrasada" : "🔧 Manutenção em breve",
          message: `${eq.name} — ${diffDays < 0 ? `${Math.abs(diffDays)}d atrasada` : `${diffDays}d restantes`}`,
          level: diffDays < 0 ? "urgent" : "warning",
          entity_id: eq.id,
          entity_type: "equipment",
        });
      }
    });

    // Deduplicate: only insert if not already exists for today
    const todayStart = new Date(today).toISOString();
    const { data: existing } = await supabase
      .from("notifications")
      .select("entity_id, type")
      .eq("company_id", companyId)
      .gte("created_at", todayStart);

    const existingKeys = new Set((existing || []).map(e => `${e.type}-${e.entity_id}`));
    const toInsert = newNotifs.filter(n => !existingKeys.has(`${n.type}-${n.entity_id}`));

    if (toInsert.length > 0) {
      await supabase.from("notifications").insert(toInsert as any);
    }

    await fetchNotifications();
  }, [companyId, fetchNotifications]);

  return {
    notifications,
    activeNotifications,
    unreadCount,
    loading,
    markAsRead,
    dismiss,
    dismissAll,
    markAllAsRead,
    markWhatsAppSent,
    syncNotifications,
    refresh: fetchNotifications,
  };
}

/** Build a WhatsApp link with a pre-filled message */
export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const fullNumber = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}
