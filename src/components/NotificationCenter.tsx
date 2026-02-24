import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, ChevronRight, BellRing, BellOff } from "lucide-react";
import { getActiveNotifications, dismissNotification, dismissAll, requestPushPermission, isPushSupported, firePushNotifications, type AppNotification } from "@/lib/notifications";

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setNotifications(getActiveNotifications());
    if (isPushSupported()) {
      setPushStatus(Notification.permission);
      firePushNotifications();
    } else {
      setPushStatus('unsupported');
    }
  }, []);

  const handleDismiss = (id: string) => {
    dismissNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleDismissAll = () => {
    dismissAll();
    setNotifications([]);
  };

  const handleEnablePush = async () => {
    const result = await requestPushPermission();
    setPushStatus(result);
    if (result === 'granted') firePushNotifications();
  };

  const handleClick = (n: AppNotification) => {
    if (n.type === 'appointment') navigate('/agenda');
    else if (n.type === 'maintenance_client') navigate('/clientes');
    else if (n.type === 'maintenance_equipment') navigate('/equipamentos');
    setOpen(false);
  };

  const levelStyles = {
    urgent: 'border-destructive/40 bg-destructive/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
    info: 'border-primary/20 bg-primary/5',
  };

  const count = notifications.length;

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl p-2 hover:bg-accent transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {open && (
        <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
          <div
            className="absolute right-2 top-14 w-[calc(100vw-1rem)] max-w-sm rounded-2xl border border-border bg-card shadow-xl animate-fade-in overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary" />
                Notificações
                {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
              </h3>
              <div className="flex items-center gap-2">
                {count > 0 && (
                  <button onClick={handleDismissAll} className="text-xs text-muted-foreground hover:text-foreground">
                    Limpar tudo
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Push permission banner */}
            {pushStatus === 'default' && (
              <button
                onClick={handleEnablePush}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs bg-primary/5 border-b border-border hover:bg-primary/10 transition-colors"
              >
                <BellRing className="h-4 w-4 text-primary shrink-0" />
                <span className="text-left text-foreground">Ativar notificações push para não perder lembretes</span>
                <ChevronRight className="h-3 w-3 ml-auto shrink-0 text-muted-foreground" />
              </button>
            )}

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {count === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <BellOff className="h-8 w-8" />
                  <p className="text-sm">Nenhuma notificação pendente</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 border-b border-border px-4 py-3 hover:bg-accent/50 transition-colors ${levelStyles[n.level]}`}
                  >
                    <button
                      onClick={() => handleClick(n)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-xs font-semibold text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                    </button>
                    <button
                      onClick={() => handleDismiss(n.id)}
                      className="shrink-0 p-1 rounded-lg hover:bg-accent"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
