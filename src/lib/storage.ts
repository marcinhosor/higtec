// Local storage helper for offline data persistence

export type Client = {
  id: string;
  name: string;
  phone: string;
  address: string;
  propertyType: string;
  observations: string;
  serviceHistory: ServiceRecord[];
  createdAt: string;
};

export type ServiceRecord = {
  id: string;
  date: string;
  serviceType: string;
  products: string[];
  observations: string;
  clientId: string;
};

export type Appointment = {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  serviceType: string;
  observations: string;
  status: 'agendado' | 'concluido';
};

export type Product = {
  id: string;
  name: string;
  manufacturer: string;
  purchaseDate: string;
  type: string;
  ph: number | null;
};

export type QuoteServiceItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type Quote = {
  id: string;
  number: number;
  date: string;
  clientId: string;
  clientName: string;
  services: QuoteServiceItem[];
  executionDeadline: string;
  paymentMethod: 'pix' | 'cartao' | 'dinheiro' | 'parcelado';
  observations: string;
  validityDays: number;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  status: 'pendente' | 'aprovado' | 'recusado';
  createdAt: string;
};

export type CompanyInfo = {
  name: string;
  phone: string;
  cnpj: string;
  logo: string;
  address: string;
  instagram: string;
  signature: string;
  isPro: boolean;
  companyDescription: string;
  differentials: string;
  serviceGuarantee: string;
  executionMethod: string;
  technicalRecommendation: string;
};

const KEYS = {
  clients: 'hig_clients',
  appointments: 'hig_appointments',
  products: 'hig_products',
  company: 'hig_company',
  quotes: 'hig_quotes',
  quoteCounter: 'hig_quote_counter',
};

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const db = {
  getClients: (): Client[] => get(KEYS.clients, []),
  saveClients: (c: Client[]) => set(KEYS.clients, c),

  getAppointments: (): Appointment[] => get(KEYS.appointments, []),
  saveAppointments: (a: Appointment[]) => set(KEYS.appointments, a),

  getProducts: (): Product[] => get(KEYS.products, []),
  saveProducts: (p: Product[]) => set(KEYS.products, p),

  getQuotes: (): Quote[] => get(KEYS.quotes, []),
  saveQuotes: (q: Quote[]) => set(KEYS.quotes, q),

  nextQuoteNumber: (): number => {
    const current = get(KEYS.quoteCounter, 0);
    const next = current + 1;
    set(KEYS.quoteCounter, next);
    return next;
  },

  getCompany: (): CompanyInfo => get(KEYS.company, {
    name: 'Hig Clean Tec', phone: '', cnpj: '', logo: '', address: '', instagram: '', signature: '',
    isPro: false, companyDescription: '', differentials: '', serviceGuarantee: '', executionMethod: '', technicalRecommendation: ''
  }),
  saveCompany: (c: CompanyInfo) => set(KEYS.company, c),

  exportAll: () => {
    return JSON.stringify({
      clients: db.getClients(),
      appointments: db.getAppointments(),
      products: db.getProducts(),
      quotes: db.getQuotes(),
      company: db.getCompany(),
    });
  },

  importAll: (json: string) => {
    const data = JSON.parse(json);
    if (data.clients) db.saveClients(data.clients);
    if (data.appointments) db.saveAppointments(data.appointments);
    if (data.products) db.saveProducts(data.products);
    if (data.quotes) db.saveQuotes(data.quotes);
    if (data.company) db.saveCompany(data.company);
  },
};

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function getPhSuggestion(ph: number | null): string {
  if (ph === null) return '';
  if (ph >= 0 && ph < 7) return 'Remove incrustações minerais, ferrugem e resíduos calcários (pH ácido)';
  if (ph === 7) return 'Indicado para manutenção leve e limpeza geral (pH neutro)';
  if (ph > 7 && ph <= 14) return 'Remove gordura, sujeira pesada e matéria orgânica (pH alcalino)';
  return 'pH fora da faixa válida (0-14)';
}

export function getMaintenanceSuggestion(serviceType: string): string {
  const lower = serviceType.toLowerCase();
  if (lower.includes('comercial') || lower.includes('escritório')) return '3 meses';
  if (lower.includes('alto fluxo') || lower.includes('hospital') || lower.includes('clínica')) return '1 a 3 meses';
  return '6 meses';
}
