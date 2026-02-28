import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, X, ChevronRight, BellRing, BellOff, MessageCircle,
  Check, CheckCheck, Clock, History
} from "lucide-react";
import { useNotifications, buildWhatsAppLink, type AppNotification } from "@/hooks/use-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyPlan } from "@/hooks/use-company-plan";
import {
  isPushSupported,
  requestPushPermission,
  firePushNotifications,
} from "@/lib/notifications";

type Tab = "active" | "history";

export default function NotificationCenter() {
  const navigate = useNavigate();
  const {
    notifications,
    activeNotifications,
    unreadCount,
    dismiss,
    dismissAll,
    markAsRead,
    markAllAsRead,
    markWhatsAppSent,
    syncNotifications,
  } = useNotifications();
  const { companyId } = useCompanyPlan();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("active");
  const [pushStatus, setPushStatus] = useState<NotificationPermission | "unsupported">("default");
  const [clientPhones, setClientPhones] = useState<Record<string, string>>({});

  // Sync notifications on mount
  useEffect(() => {
    syncNotifications();
    if (isPushSupported()) {
      setPushStatus(Notification.permission);
      firePushNotifications();
    } else {
      setPushStatus("unsupported");
    }
  }, [syncNotifications]);

  // Load client phones for WhatsApp
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("clients")
      .select("id, phone")
      .eq("company_id", companyId)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach(c => { if (c.phone) map[c.id] = c.phone; });
          setClientPhones(map);
        }
      });
  }, [companyId]);

  const handleEnablePush = async () => {
    const result = await requestPushPermission();
    setPushStatus(result);
    if (result === "granted") firePushNotifications();
  };

  const handleClick = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.type === "appointment") navigate("/agenda");
    else if (n.type === "maintenance_client") navigate("/clientes");
    else if (n.type === "maintenance_equipment") navigate("/equipamentos");
    setOpen(false);
  };

  const handleWhatsApp = (n: AppNotification) => {
    const phone = n.entity_id ? clientPhones[n.entity_id] : null;
    if (!phone) return;
    const msg =
      n.type === "appointment"
        ? `Olá! Lembrando do seu agendamento: ${n.message}. Confirma presença?`
        : `Olá! ${n.message}. Gostaria de agendar uma manutenção preventiva?`;
    window.open(buildWhatsAppLink(phone, msg), "_blank");
    markWhatsAppSent(n.id);
  };

  const levelStyles = {
    urgent: "border-destructive/40 bg-destructive/10",
    warning: "border-yellow-500/30 bg-yellow-500/10",
    info: "border-primary/20 bg-primary/5",
  };

  const displayList =
    tab === "active"
      ? activeNotifications
      : notifications.filter(n => n.dismissed || n.read);

  const count = unreadCount;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl p-2 hover:bg-accent transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
          <div
            className="absolute right-2 top-14 w-[calc(100vw-1rem)] max-w-sm rounded-2xl border border-border bg-card shadow-xl animate-fade-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary" />
                Notificações
                {count > 0 && (
                  <span className="text-xs text-muted-foreground">({count})</span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {tab === "active" && activeNotifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-muted-foreground hover:text-foreground"
                      title="Marcar tudo como lido"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={dismissAll}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Limpar
                    </button>
                  </>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setTab("active")}
                className={`flex-1 text-xs py-2 font-medium transition-colors ${
                  tab === "active"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bell className="h-3.5 w-3.5 inline mr-1" />
                Ativas ({activeNotifications.length})
              </button>
              <button
                onClick={() => setTab("history")}
                className={`flex-1 text-xs py-2 font-medium transition-colors ${
                  tab === "history"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-3.5 w-3.5 inline mr-1" />
                Histórico
              </button>
            </div>

            {/* Push permission banner */}
            {pushStatus === "default" && tab === "active" && (
              <button
                onClick={handleEnablePush}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs bg-primary/5 border-b border-border hover:bg-primary/10 transition-colors"
              >
                <BellRing className="h-4 w-4 text-primary shrink-0" />
                <span className="text-left text-foreground">
                  Ativar notificações push para não perder lembretes
                </span>
                <ChevronRight className="h-3 w-3 ml-auto shrink-0 text-muted-foreground" />
              </button>
            )}

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {displayList.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <BellOff className="h-8 w-8" />
                  <p className="text-sm">
                    {tab === "active"
                      ? "Nenhuma notificação pendente"
                      : "Nenhum histórico"}
                  </p>
                </div>
              ) : (
                displayList.map((n) => {
                  const canWhatsApp =
                    (n.type === "maintenance_client" || n.type === "appointment") &&
                    n.entity_id &&
                    clientPhones[n.entity_id];

                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 border-b border-border px-4 py-3 hover:bg-accent/50 transition-colors ${
                        levelStyles[n.level as keyof typeof levelStyles] || ""
                      } ${!n.read ? "font-medium" : "opacity-75"}`}
                    >
                      <button
                        onClick={() => handleClick(n)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                          {n.title}
                          {n.read && (
                            <Check className="h-3 w-3 text-muted-foreground" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {n.message}
                        </p>
                        {tab === "history" && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(n.created_at).toLocaleDateString("pt-BR")}{" "}
                            {new Date(n.created_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {n.whatsapp_sent && (
                              <span className="ml-1 text-green-600">✓ WhatsApp</span>
                            )}
                          </p>
                        )}
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {canWhatsApp && !n.whatsapp_sent && (
                          <button
                            onClick={() => handleWhatsApp(n)}
                            className="p-1 rounded-lg hover:bg-green-500/20 text-green-600"
                            title="Enviar via WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {tab === "active" && (
                          <button
                            onClick={() => dismiss(n.id)}
                            className="p-1 rounded-lg hover:bg-accent"
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
