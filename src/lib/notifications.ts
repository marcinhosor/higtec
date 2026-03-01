import { db, Client, Equipment } from "./storage";

export type AppNotification = {
  id: string;
  type: 'appointment' | 'maintenance_client' | 'maintenance_equipment' | 'quote_pending';
  title: string;
  message: string;
  level: 'info' | 'warning' | 'urgent';
  entityId: string;
  createdAt: string;
  dismissed: boolean;
};

/** Check if browser push notifications are supported and granted */
export function isPushSupported(): boolean {
  return 'Notification' in window;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  return Notification.requestPermission();
}

export function sendBrowserNotification(title: string, body: string, tag?: string) {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.ico', tag, badge: '/favicon.ico' });
  } catch { /* silent fail on mobile */ }
}

/** Build all pending notifications from current data */
export function buildNotifications(): AppNotification[] {
  const notifications: AppNotification[] = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // 1. Appointments today & tomorrow
  const appointments = db.getAppointments();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  appointments
    .filter(a => a.status === 'agendado' && (a.date === today || a.date === tomorrowStr))
    .forEach(a => {
      const isToday = a.date === today;
      notifications.push({
        id: `appt-${a.id}`,
        type: 'appointment',
        title: isToday ? '📅 Agendamento hoje' : '📅 Agendamento amanhã',
        message: `${a.clientName} — ${a.serviceType}${a.time ? ` às ${a.time}` : ''}`,
        level: isToday ? 'warning' : 'info',
        entityId: a.id,
        createdAt: now.toISOString(),
        dismissed: false,
      });
    });

  // 2. Client maintenance alerts (5+ months)
  const clients = db.getClients();
  clients.forEach(client => {
    const history = client.serviceHistory || [];
    let refDate: string;
    if (history.length > 0) {
      const last = history.reduce((l, s) => new Date(s.date) > new Date(l.date) ? s : l, history[0]);
      refDate = last.date;
    } else {
      refDate = client.createdAt;
    }
    if (!refDate) return;
    const d = new Date(refDate);
    if (isNaN(d.getTime())) return;
    const months = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (months >= 5) {
      notifications.push({
        id: `maint-${client.id}`,
        type: 'maintenance_client',
        title: months >= 6 ? '⚠️ Manutenção urgente' : '🔔 Manutenção próxima',
        message: `${client.name} — ${Math.floor(months)} meses sem higienização`,
        level: months >= 6 ? 'urgent' : 'warning',
        entityId: client.id,
        createdAt: now.toISOString(),
        dismissed: false,
      });
    }
  });

  // 3. Equipment maintenance
  const equipment = db.getEquipment();
  equipment
    .filter(eq => eq.nextMaintenance && eq.status !== 'inativo')
    .forEach(eq => {
      const next = new Date(eq.nextMaintenance);
      const diffDays = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        notifications.push({
          id: `equip-${eq.id}`,
          type: 'maintenance_equipment',
          title: diffDays < 0 ? '🔴 Manutenção atrasada' : '🔧 Manutenção em breve',
          message: `${eq.name} — ${diffDays < 0 ? `${Math.abs(diffDays)}d atrasada` : `${diffDays}d restantes`}`,
          level: diffDays < 0 ? 'urgent' : 'warning',
          entityId: eq.id,
          createdAt: now.toISOString(),
          dismissed: false,
        });
      }
    });

  // 4. Quotes pending for more than 1 day (no response)
  const quotes = db.getQuotes();
  quotes
    .filter(q => q.status === 'pendente' || q.status === 'nao_respondeu')
    .forEach(q => {
      const created = new Date(q.createdAt);
      const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
      if (diffHours >= 24) {
        const days = Math.floor(diffHours / 24);
        notifications.push({
          id: `quote-pending-${q.id}`,
          type: 'quote_pending',
          title: days >= 3 ? '🔴 Orçamento sem resposta' : '💬 Follow-up de orçamento',
          message: `${q.clientName} — Orçamento ${String(q.number).padStart(2, '0')} há ${days} dia(s). Tente um upsell ou desconto para converter!`,
          level: days >= 3 ? 'urgent' : 'warning',
          entityId: q.id,
          createdAt: now.toISOString(),
          dismissed: false,
        });
      }
    });

  // Sort by level priority
  const order = { urgent: 0, warning: 1, info: 2 };
  notifications.sort((a, b) => order[a.level] - order[b.level]);
  return notifications;
}

/** Get dismissed notification IDs from localStorage */
function getDismissedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem('dismissed_notifications') || '[]'));
  } catch { return new Set(); }
}

export function dismissNotification(id: string) {
  const ids = getDismissedIds();
  ids.add(id);
  localStorage.setItem('dismissed_notifications', JSON.stringify([...ids]));
}

export function dismissAll() {
  const all = buildNotifications().map(n => n.id);
  localStorage.setItem('dismissed_notifications', JSON.stringify(all));
}

export function getActiveNotifications(): AppNotification[] {
  const dismissed = getDismissedIds();
  return buildNotifications().filter(n => !dismissed.has(n.id));
}

/** Fire browser push for urgent/warning notifications not yet pushed today */
export function firePushNotifications() {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  const today = new Date().toISOString().split('T')[0];
  const pushedKey = `push_sent_${today}`;
  const pushed = new Set(JSON.parse(localStorage.getItem(pushedKey) || '[]'));
  
  const active = getActiveNotifications();
  active
    .filter(n => n.level !== 'info' && !pushed.has(n.id))
    .slice(0, 5) // limit
    .forEach(n => {
      sendBrowserNotification(n.title, n.message, n.id);
      pushed.add(n.id);
    });
  
  localStorage.setItem(pushedKey, JSON.stringify([...pushed]));
}
