// Analytics and subscription tracking (localStorage-based)

export type AnalyticsEvent = {
  id: string;
  event: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type SubscriptionData = {
  planType: 'free' | 'start' | 'pro' | 'premium';
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionStatus: 'inactive' | 'trial' | 'active' | 'canceled' | 'grace';
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  lastActiveDate: string;
  intentUpgradeFlag: boolean;
  churnReason: string | null;
  onboardingCompleted: boolean;
  onboardingStep: number;
  quotesCreated: number;
  daysUsed: number;
  firstUseDate: string | null;
};

const KEYS = {
  analytics: 'hig_analytics_events',
  subscription: 'hig_subscription',
};

function getDefault(): SubscriptionData {
  return {
    planType: 'free',
    trialStartDate: null,
    trialEndDate: null,
    subscriptionStatus: 'inactive',
    subscriptionStart: null,
    subscriptionEnd: null,
    lastActiveDate: new Date().toISOString(),
    intentUpgradeFlag: false,
    churnReason: null,
    onboardingCompleted: false,
    onboardingStep: 0,
    quotesCreated: 0,
    daysUsed: 0,
    firstUseDate: null,
  };
}

export function getSubscription(): SubscriptionData {
  try {
    const data = localStorage.getItem(KEYS.subscription);
    return data ? { ...getDefault(), ...JSON.parse(data) } : getDefault();
  } catch {
    return getDefault();
  }
}

export function saveSubscription(sub: SubscriptionData) {
  localStorage.setItem(KEYS.subscription, JSON.stringify(sub));
}

export function trackEvent(event: string, metadata?: Record<string, unknown>) {
  try {
    const events: AnalyticsEvent[] = JSON.parse(localStorage.getItem(KEYS.analytics) || '[]');
    events.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      event,
      timestamp: new Date().toISOString(),
      metadata,
    });
    // Keep last 500 events
    if (events.length > 500) events.splice(0, events.length - 500);
    localStorage.setItem(KEYS.analytics, JSON.stringify(events));
  } catch { /* silent */ }
}

export function updateLastActive() {
  const sub = getSubscription();
  const today = new Date().toISOString().split('T')[0];
  const lastDay = sub.lastActiveDate?.split('T')[0];
  if (lastDay !== today) {
    sub.daysUsed = (sub.daysUsed || 0) + 1;
  }
  sub.lastActiveDate = new Date().toISOString();
  if (!sub.firstUseDate) sub.firstUseDate = new Date().toISOString();
  saveSubscription(sub);
}

export function startTrial() {
  const sub = getSubscription();
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  sub.planType = 'pro';
  sub.trialStartDate = now.toISOString();
  sub.trialEndDate = end.toISOString();
  sub.subscriptionStatus = 'trial';
  sub.intentUpgradeFlag = false;
  saveSubscription(sub);
  trackEvent('started_trial');
}

export function isTrialExpired(): boolean {
  const sub = getSubscription();
  if (sub.subscriptionStatus !== 'trial' || !sub.trialEndDate) return false;
  return new Date() > new Date(sub.trialEndDate);
}

export function getTrialDaysRemaining(): number {
  const sub = getSubscription();
  if (!sub.trialEndDate) return 0;
  const diff = new Date(sub.trialEndDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function incrementQuotesCreated() {
  const sub = getSubscription();
  sub.quotesCreated = (sub.quotesCreated || 0) + 1;
  saveSubscription(sub);
}

export function getOnboardingMessage(): string | null {
  const sub = getSubscription();
  if (sub.subscriptionStatus === 'active') return null;
  
  // Trial expiring soon
  if (sub.subscriptionStatus === 'trial') {
    const days = getTrialDaysRemaining();
    if (days <= 3 && days > 0) {
      return `Seu teste termina em ${days} dia${days > 1 ? 's' : ''}. Não perca seus relatórios premium.`;
    }
  }

  // After 5 days of use
  if (sub.daysUsed >= 5 && sub.planType === 'free') {
    return 'Empresas organizadas lucram mais. Teste o Modo PRO gratuitamente.';
  }

  // After 3 quotes
  if ((sub.quotesCreated || 0) >= 3 && sub.planType === 'free') {
    return 'Você já utilizou o sistema 3 vezes. Desbloqueie controle de estoque automático.';
  }

  // After first quote
  if ((sub.quotesCreated || 0) >= 1 && sub.planType === 'free') {
    return 'Quer que seu relatório tenha sua marca e aparência profissional? Ative o PRO.';
  }

  return null;
}
