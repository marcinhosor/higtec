// Local storage helper for offline data persistence

export const BRAZILIAN_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
] as const;

export type Client = {
  id: string;
  name: string;
  phone: string;
  address: string;
  // Structured address fields
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
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
  // Time tracking for business analytics
  startTime?: string;
  endTime?: string;
  totalMinutes?: number;
  technicianName?: string;
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
  technicianId: string;
  technicianName: string;
};

export type ConsumptionRecord = {
  id: string;
  date: string;
  volumeUsedMl: number;
  serviceDescription: string;
};

export type Product = {
  id: string;
  name: string;
  manufacturer: string;
  purchaseDate: string;
  type: string;
  ph: number | null;
  // PRO fields
  pricePaid: number | null;
  paymentMethod: 'pix' | 'debito' | 'credito' | 'dinheiro' | 'boleto' | '';
  volumeLiters: number | null;
  // Stock control (PRO)
  initialVolume: number | null;
  availableVolume: number | null;
  minAlertVolume: number | null;
  stockStatus: 'normal' | 'baixo' | 'critico';
  consumptionHistory: ConsumptionRecord[];
  // Future expansion (PRO)
  consumptionPerService: number | null;
  costPerService: number | null;
  profitMargin: number | null;
};

export type ServiceType = {
  id: string;
  name: string;
  defaultPrice: number;
  avgExecutionMinutes: number;
  avgMarginPercent: number;
  isCustom: boolean;
  isActive: boolean;
  order: number;
  createdAt: string;
};

export type QuoteServiceItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  // Area-based fields (Tapete/Carpete)
  isAreaBased?: boolean;
  length?: number;
  width?: number;
  pricePerM2?: number;
  calculatedArea?: number;
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
  status: 'pendente' | 'aprovado' | 'recusado' | 'nao_respondeu';
  createdAt: string;
};

export type Manufacturer = {
  id: string;
  name: string;
  createdAt: string;
};

export type Collaborator = {
  id: string;
  name: string;
  role: string;
  phone: string;
  cpf: string;
  admissionDate: string;
  status: 'ativo' | 'inativo';
  signature: string;
  createdAt: string;
};

export type ExecutionPhoto = {
  id: string;
  dataUrl: string;
  description: string;
  timestamp: string;
  phase: 'before' | 'after';
};

export type NonConformity = {
  id: string;
  type: string;
  severity: 'leve' | 'moderado' | 'grave';
  description: string;
  clientAware: boolean;
  clientSignature: string;
  timestamp: string;
};

export type ExecutionProduct = {
  id: string;
  productId: string;
  productName: string;
  dilution: string;
  solutionVolumeLiters: number;
  concentratedMl: number;
  waterLiters: number;
  deducted: boolean;
};

export type ServiceExecution = {
  id: string;
  appointmentId: string;
  clientId: string;
  clientName: string;
  serviceType: string;
  technicianId: string;
  technicianName: string;
  fiberType: string;
  soilingLevel: string;
  soilingType: string;
  photosBefore: ExecutionPhoto[];
  photosAfter: ExecutionPhoto[];
  nonConformities: NonConformity[];
  productsUsed: ExecutionProduct[];
  observations: string;
  processDescription: string;
  startTime: string;
  endTime: string;
  totalMinutes: number;
  totalCost: number;
  status: 'em_andamento' | 'finalizado';
  createdAt: string;
};

export type Equipment = {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseCost: number | null;
  status: 'operacional' | 'em_manutencao' | 'inativo';
  lastMaintenance: string;
  nextMaintenance: string;
  maintenanceCost: number | null;
  observations: string;
  createdAt: string;
};

export type PixKey = {
  id: string;
  type: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  value: string;
  isPrimary: boolean;
};

export type BankData = {
  bankName: string;
  agency: string;
  account: string;
  accountType: 'corrente' | 'poupanca';
  holderName: string;
  holderDocument: string;
};

export type ThemePalette = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  cta?: string;
  gray?: string;
};

export type CustomTheme = {
  enabled: boolean;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  cta: string;
  textColor: string;
  cardColor: string;
};

export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  enabled: false,
  primary: '#2980CD',
  secondary: '#D6E9F8',
  accent: '#1a5276',
  background: '#f0f7ff',
  cta: '#2980CD',
  textColor: '#1a2332',
  cardColor: '#FFFFFF',
};

export const THEME_PALETTES: ThemePalette[] = [
  { id: 'default', name: 'Azul Padrão', primary: '#2980CD', secondary: '#D6E9F8', accent: '#1a5276', background: '#f0f7ff' },
  { id: 'signature', name: '💎 Signature Luxo Premium', primary: '#0D0D0D', secondary: '#C6A756', accent: '#D4AF37', background: '#F5F5F5', cta: '#D4AF37', gray: '#2A2A2A' },
  { id: 'royal-blue', name: '🔷 Royal Blue Elite', primary: '#142B4D', secondary: '#3E6EA1', accent: '#1F4E8C', background: '#F4F8FC', cta: '#1F4E8C', gray: '#D9E2EC' },
  { id: 'aqua-clean', name: '🌊 Aqua Clean Pro', primary: '#1C7C9C', secondary: '#9ED8E6', accent: '#146C88', background: '#F2FBFD', cta: '#146C88', gray: '#D7E9EF' },
  { id: 'platinum', name: '🟣 Platinum Modern', primary: '#2B2B2B', secondary: '#BFC4C9', accent: '#4A4F55', background: '#F7F7F7', cta: '#4A4F55', gray: '#E5E7EA' },
  { id: 'emerald', name: '🟢 Emerald Executive', primary: '#0F3D2E', secondary: '#2F7A5C', accent: '#1E5E47', background: '#F4FBF7', cta: '#1E5E47', gray: '#DCE8E2' },
  { id: 'titanium-dark', name: '🔥 Titanium Dark', primary: '#1A1F24', secondary: '#3A3F45', accent: '#5C6B7A', background: '#111418', cta: '#5C6B7A', gray: '#2A2F35' },
];

export type PlanTier = 'free' | 'pro' | 'premium';

export type CompanyInfo = {
  name: string;
  phone: string;
  cnpj: string;
  logo: string;
  address: string;
  instagram: string;
  signature: string;
  isPro: boolean;
  planTier: PlanTier;
  selectedThemeId: string;
  customTheme?: CustomTheme;
  companyDescription: string;
  differentials: string;
  serviceGuarantee: string;
  executionMethod: string;
  technicalRecommendation: string;
  // PRO: Payment data
  bankData: BankData;
  pixKeys: PixKey[];
};
const KEYS = {
  clients: 'hig_clients',
  appointments: 'hig_appointments',
  products: 'hig_products',
  company: 'hig_company',
  quotes: 'hig_quotes',
  quoteCounter: 'hig_quote_counter',
  manufacturers: 'hig_manufacturers',
  collaborators: 'hig_collaborators',
  serviceTypes: 'hig_service_types',
  executions: 'hig_executions',
  equipment: 'hig_equipment',
};

const DEFAULT_SERVICE_TYPES: Omit<ServiceType, 'id' | 'createdAt'>[] = [
  { name: 'Sofá', defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0, isCustom: false, isActive: true, order: 0 },
  { name: 'Sofá Retrátil/Reclinável', defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0, isCustom: false, isActive: true, order: 1 },
  { name: 'Colchão', defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0, isCustom: false, isActive: true, order: 2 },
  { name: 'Cadeira', defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0, isCustom: false, isActive: true, order: 3 },
  { name: 'Poltrona', defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0, isCustom: false, isActive: true, order: 4 },
  { name: 'Tapete', defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0, isCustom: false, isActive: true, order: 5 },
  { name: 'Carpete', defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0, isCustom: false, isActive: true, order: 6 },
  { name: 'Banco Automotivo', defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0, isCustom: false, isActive: true, order: 7 },
  { name: 'Impermeabilização', defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0, isCustom: false, isActive: true, order: 8 },
  { name: 'Outro', defaultPrice: 0, avgExecutionMinutes: 0, avgMarginPercent: 0, isCustom: false, isActive: true, order: 9 },
];

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Storage quota exceeded for key:', key, e);
    return false;
  }
}

export const db = {
  getClients: (): Client[] => get(KEYS.clients, []).map(c => ({
    street: '', number: '', complement: '', neighborhood: '', city: '', state: '', ...c,
  })),
  saveClients: (c: Client[]) => set(KEYS.clients, c),

  getAppointments: (): Appointment[] => get(KEYS.appointments, []),
  saveAppointments: (a: Appointment[]) => set(KEYS.appointments, a),

  getProducts: (): Product[] => get(KEYS.products, []),
  saveProducts: (p: Product[]) => set(KEYS.products, p),

  getQuotes: (): Quote[] => get(KEYS.quotes, []),
  saveQuotes: (q: Quote[]) => set(KEYS.quotes, q),

  getManufacturers: (): Manufacturer[] => get(KEYS.manufacturers, []),
  saveManufacturers: (m: Manufacturer[]) => set(KEYS.manufacturers, m),
  
  getCollaborators: (): Collaborator[] => get(KEYS.collaborators, []),
  saveCollaborators: (c: Collaborator[]) => set(KEYS.collaborators, c),

  getServiceTypes: (): ServiceType[] => {
    const stored = get<ServiceType[]>(KEYS.serviceTypes, []);
    if (stored.length === 0) {
      const defaults: ServiceType[] = DEFAULT_SERVICE_TYPES.map(s => ({
        ...s, id: generateId(), createdAt: new Date().toISOString()
      }));
      set(KEYS.serviceTypes, defaults);
      return defaults;
    }
    return stored;
  },
  saveServiceTypes: (s: ServiceType[]) => set(KEYS.serviceTypes, s),

  getExecutions: (): ServiceExecution[] => get(KEYS.executions, []),
  saveExecutions: (e: ServiceExecution[]): boolean => set(KEYS.executions, e),

  getEquipment: (): Equipment[] => get(KEYS.equipment, []),
  saveEquipment: (e: Equipment[]): boolean => set(KEYS.equipment, e),

  addManufacturer: (name: string): Manufacturer => {
    const manufacturers = get<Manufacturer[]>(KEYS.manufacturers, []);
    const existing = manufacturers.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const newM: Manufacturer = { id: generateId(), name, createdAt: new Date().toISOString() };
    manufacturers.push(newM);
    set(KEYS.manufacturers, manufacturers);
    return newM;
  },

  nextQuoteNumber: (): number => {
    const current = get(KEYS.quoteCounter, 0);
    const next = current + 1;
    set(KEYS.quoteCounter, next);
    return next;
  },

  getCompany: (): CompanyInfo => {
    const defaults: CompanyInfo = {
      name: 'Hig Clean Tec', phone: '', cnpj: '', logo: '', address: '', instagram: '', signature: '',
      isPro: false, planTier: 'free', selectedThemeId: 'default',
      companyDescription: '', differentials: '', serviceGuarantee: '', executionMethod: '', technicalRecommendation: '',
      bankData: { bankName: '', agency: '', account: '', accountType: 'corrente' as const, holderName: '', holderDocument: '' },
      pixKeys: [],
    };
    const c: CompanyInfo = { ...defaults, ...get(KEYS.company, defaults) };
    if (!c.planTier) c.planTier = c.isPro ? 'pro' : 'free';
    if (!c.selectedThemeId) c.selectedThemeId = 'default';
    // Keep isPro synced with planTier for backward compatibility
    c.isPro = c.planTier !== 'free';
    return c;
  },
  saveCompany: (c: CompanyInfo) => set(KEYS.company, c),

  exportAll: () => {
    return JSON.stringify({
      clients: db.getClients(),
      appointments: db.getAppointments(),
      products: db.getProducts(),
      quotes: db.getQuotes(),
      company: db.getCompany(),
      collaborators: db.getCollaborators(),
      serviceTypes: db.getServiceTypes(),
      executions: db.getExecutions(),
      equipment: db.getEquipment(),
    });
  },

  importAll: (json: string) => {
    const data = JSON.parse(json);
    if (data.clients) db.saveClients(data.clients);
    if (data.appointments) db.saveAppointments(data.appointments);
    if (data.products) db.saveProducts(data.products);
    if (data.quotes) db.saveQuotes(data.quotes);
    if (data.company) db.saveCompany(data.company);
    if (data.collaborators) db.saveCollaborators(data.collaborators);
    if (data.serviceTypes) db.saveServiceTypes(data.serviceTypes);
    if (data.executions) db.saveExecutions(data.executions);
    if (data.equipment) db.saveEquipment(data.equipment);
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

export function calculateStockStatus(product: Product): Product['stockStatus'] {
  if (product.availableVolume === null || product.initialVolume === null) return 'normal';
  if (product.minAlertVolume !== null && product.availableVolume <= product.minAlertVolume) return 'critico';
  if (product.availableVolume <= product.initialVolume * 0.2) return 'baixo';
  return 'normal';
}

export function deductStock(productId: string, volumeUsedMl: number, serviceDescription: string): boolean {
  const products = db.getProducts();
  const idx = products.findIndex(p => p.id === productId);
  if (idx === -1) return false;
  const p = products[idx];
  if (p.availableVolume === null) return false;
  const litersUsed = volumeUsedMl / 1000;
  const newVolume = Math.max(0, p.availableVolume - litersUsed);
  p.availableVolume = Math.round(newVolume * 1000) / 1000;
  p.consumptionHistory = [
    ...(p.consumptionHistory || []),
    { id: generateId(), date: new Date().toISOString(), volumeUsedMl, serviceDescription }
  ];
  p.stockStatus = calculateStockStatus(p);
  products[idx] = p;
  db.saveProducts(products);
  return true;
}

export function restockProduct(productId: string, addVolume: number, addPrice: number): boolean {
  const products = db.getProducts();
  const idx = products.findIndex(p => p.id === productId);
  if (idx === -1) return false;
  const p = products[idx];
  const oldTotal = (p.pricePaid || 0);
  const oldVolume = (p.volumeLiters || 0);
  p.volumeLiters = oldVolume + addVolume;
  p.pricePaid = oldTotal + addPrice;
  p.availableVolume = (p.availableVolume || 0) + addVolume;
  p.initialVolume = (p.initialVolume || 0) + addVolume;
  p.purchaseDate = new Date().toISOString().split('T')[0];
  p.stockStatus = calculateStockStatus(p);
  products[idx] = p;
  db.saveProducts(products);
  return true;
}

export function getLowStockProducts(): Product[] {
  const company = db.getCompany();
  if (!company.isPro) return [];
  return db.getProducts().filter(p => {
    if (p.availableVolume === null || p.initialVolume === null) return false;
    const status = calculateStockStatus(p);
    return status === 'baixo' || status === 'critico';
  });
}

export function getPendingMaintenanceEquipment(): Equipment[] {
  const company = db.getCompany();
  if (company.planTier !== 'premium') return [];
  const now = new Date();
  return db.getEquipment().filter(eq => {
    if (!eq.nextMaintenance || eq.status === 'inativo') return false;
    const next = new Date(eq.nextMaintenance);
    // Alert if maintenance is due within 7 days or overdue
    const diffDays = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  });
}
