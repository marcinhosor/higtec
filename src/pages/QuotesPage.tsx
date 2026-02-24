import { useState, useEffect, useMemo } from "react";
import PageShell from "@/components/PageShell";
import { db, Quote, QuoteServiceItem, ServiceType, Client, Appointment, Collaborator, BRAZILIAN_STATES, generateId } from "@/lib/storage";
import { Plus, Trash2, FileText, Send, CalendarPlus, Eye, Check, X, Clock, Ruler, User, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { generateQuotePDF, generateProposalPDF } from "@/lib/pdf-quote";

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  parcelado: "Parcelado",
};

const isAreaBasedService = (name: string) => {
  const lower = name.toLowerCase();
  return lower === 'tapete' || lower === 'carpete';
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>(() => db.getClients());
  const [serviceTypes] = useState(() => db.getServiceTypes().filter(st => st.isActive).sort((a, b) => a.order - b.order));
  const [company] = useState(() => db.getCompany());
  const [collaborators] = useState<Collaborator[]>(() => db.getCollaborators().filter(c => c.status === 'ativo'));
  const [appointments, setAppointments] = useState<Appointment[]>(() => db.getAppointments());
  const [open, setOpen] = useState(false);
  const [viewQuote, setViewQuote] = useState<Quote | null>(null);
  const [customServiceNames, setCustomServiceNames] = useState<Record<string, string>>({});
  
  // Schedule dialog state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleQuote, setScheduleQuote] = useState<Quote | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ date: "", time: "", technicianId: "", technicianName: "", observations: "" });
  
  // Edit client dialog state
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editClientData, setEditClientData] = useState<Client | null>(null);

  const emptyService = (): QuoteServiceItem => ({ id: generateId(), name: "", quantity: 1, unitPrice: 0 });

  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    services: [emptyService()] as QuoteServiceItem[],
    executionDeadline: "",
    paymentMethod: "pix" as Quote["paymentMethod"],
    observations: "",
    validityDays: 5,
    discountType: "percent" as Quote["discountType"],
    discountValue: 0,
  });

  useEffect(() => { setQuotes(db.getQuotes()); }, []);

  const getServiceUnitPrice = (s: QuoteServiceItem) => {
    if (s.isAreaBased && s.length && s.width && s.pricePerM2) {
      const area = Math.round(s.length * s.width * 100) / 100;
      return Math.round(area * s.pricePerM2 * 100) / 100;
    }
    return s.unitPrice;
  };

  const subtotal = form.services.reduce((sum, s) => sum + s.quantity * getServiceUnitPrice(s), 0);
  const discount = form.discountType === "percent" ? subtotal * (form.discountValue / 100) : form.discountValue;
  const total = Math.max(0, subtotal - discount);

  // PRO: estimated time and margin
  const estimatedMinutes = form.services.reduce((sum, s) => {
    const st = serviceTypes.find(t => t.name === s.name);
    return sum + (st?.avgExecutionMinutes || 0) * s.quantity;
  }, 0);
  const estimatedMargin = company.isPro ? form.services.reduce((sum, s) => {
    const st = serviceTypes.find(t => t.name === s.name);
    const price = s.quantity * getServiceUnitPrice(s);
    return sum + price * ((st?.avgMarginPercent || 0) / 100);
  }, 0) : 0;

  const addService = () => setForm({ ...form, services: [...form.services, emptyService()] });
  const removeService = (id: string) => setForm({ ...form, services: form.services.filter(s => s.id !== id) });
  const updateService = (id: string, field: keyof QuoteServiceItem, value: any) => {
    setForm({ ...form, services: form.services.map(s => s.id === id ? { ...s, [field]: value } : s) });
  };

  const selectServiceType = (serviceId: string, typeName: string) => {
    const st = serviceTypes.find(t => t.name === typeName);
    const isArea = isAreaBasedService(typeName);
    setForm({
      ...form,
      services: form.services.map(s => s.id === serviceId ? {
        ...s,
        name: typeName === 'Outro' ? (customServiceNames[serviceId] || '') : typeName,
        unitPrice: st?.defaultPrice || s.unitPrice,
        isAreaBased: isArea,
        length: isArea ? (s.length || 0) : undefined,
        width: isArea ? (s.width || 0) : undefined,
        pricePerM2: isArea ? (s.pricePerM2 || 0) : undefined,
        calculatedArea: undefined,
      } : s)
    });
  };

  const save = () => {
    if (!form.clientName.trim()) { toast.error("Selecione um cliente"); return; }
    if (form.services.every(s => !s.name.trim())) { toast.error("Adicione ao menos um serviço"); return; }

    // Calculate final unit prices for area-based services
    const finalServices = form.services.filter(s => s.name.trim()).map(s => {
      if (s.isAreaBased && s.length && s.width && s.pricePerM2) {
        const area = Math.round(s.length * s.width * 100) / 100;
        return { ...s, unitPrice: Math.round(area * s.pricePerM2 * 100) / 100, calculatedArea: area, name: `${s.name} – ${area} m²` };
      }
      return s;
    });

    const quote: Quote = {
      id: generateId(),
      number: db.nextQuoteNumber(),
      date: new Date().toISOString().split("T")[0],
      clientId: form.clientId,
      clientName: form.clientName,
      services: finalServices,
      executionDeadline: form.executionDeadline,
      paymentMethod: form.paymentMethod,
      observations: form.observations,
      validityDays: form.validityDays,
      discountType: form.discountType,
      discountValue: form.discountValue,
      status: "pendente",
      createdAt: new Date().toISOString(),
    };

    const updated = [quote, ...quotes];
    db.saveQuotes(updated);
    setQuotes(updated);
    setOpen(false);
    resetForm();
    toast.success("Orçamento #" + quote.number + " criado!");
  };

  const resetForm = () => {
    setForm({
      clientId: "", clientName: "", services: [emptyService()],
      executionDeadline: "", paymentMethod: "pix", observations: "",
      validityDays: 5, discountType: "percent", discountValue: 0,
    });
  };

  const updateStatus = (id: string, status: Quote["status"]) => {
    const updated = quotes.map(q => q.id === id ? { ...q, status } : q);
    db.saveQuotes(updated);
    setQuotes(updated);
    toast.success(status === "aprovado" ? "Orçamento aprovado!" : "Status atualizado");
  };

  const removeQuote = (id: string) => {
    const updated = quotes.filter(q => q.id !== id);
    db.saveQuotes(updated);
    setQuotes(updated);
    toast.success("Orçamento removido");
  };

  const [editQuoteOpen, setEditQuoteOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [editQuoteForm, setEditQuoteForm] = useState({
    services: [] as QuoteServiceItem[],
    executionDeadline: "", paymentMethod: "pix" as Quote["paymentMethod"],
    observations: "", validityDays: 5, discountType: "percent" as Quote["discountType"], discountValue: 0,
  });

  const openEditQuote = (q: Quote) => {
    setEditingQuote(q);
    setEditQuoteForm({
      services: q.services.map(s => ({ ...s })),
      executionDeadline: q.executionDeadline, paymentMethod: q.paymentMethod,
      observations: q.observations, validityDays: q.validityDays,
      discountType: q.discountType, discountValue: q.discountValue,
    });
    setEditQuoteOpen(true);
  };

  const saveEditQuote = () => {
    if (!editingQuote) return;
    const finalServices = editQuoteForm.services.filter(s => s.name.trim());
    const updated = quotes.map(q => q.id === editingQuote.id ? {
      ...q, services: finalServices, executionDeadline: editQuoteForm.executionDeadline,
      paymentMethod: editQuoteForm.paymentMethod, observations: editQuoteForm.observations,
      validityDays: editQuoteForm.validityDays, discountType: editQuoteForm.discountType,
      discountValue: editQuoteForm.discountValue,
    } : q);
    db.saveQuotes(updated);
    setQuotes(updated);
    setEditQuoteOpen(false);
    setEditingQuote(null);
    toast.success("Orçamento atualizado!");
  };

  const updateEditService = (id: string, field: keyof QuoteServiceItem, value: any) => {
    setEditQuoteForm({ ...editQuoteForm, services: editQuoteForm.services.map(s => s.id === id ? { ...s, [field]: value } : s) });
  };

  const openScheduleDialog = (q: Quote) => {
    setScheduleQuote(q);
    setScheduleForm({ date: "", time: "", technicianId: "", technicianName: "", observations: `Orçamento #${q.number} - ${q.observations}` });
    setScheduleOpen(true);
  };

  const getBusyTimes = (date: string) => {
    return appointments.filter(a => a.date === date && a.status === 'agendado').map(a => a.time).filter(Boolean);
  };

  const confirmSchedule = () => {
    if (!scheduleQuote || !scheduleForm.date) { toast.error("Selecione uma data"); return; }
    const appt: Appointment = {
      id: generateId(),
      clientId: scheduleQuote.clientId,
      clientName: scheduleQuote.clientName,
      date: scheduleForm.date,
      time: scheduleForm.time,
      serviceType: scheduleQuote.services.map(s => s.name).join(", "),
      observations: scheduleForm.observations,
      status: "agendado",
      technicianId: scheduleForm.technicianId,
      technicianName: scheduleForm.technicianName,
    };
    const updatedAppts = [...appointments, appt];
    db.saveAppointments(updatedAppts);
    setAppointments(updatedAppts);
    updateStatus(scheduleQuote.id, "aprovado");
    setScheduleOpen(false);
    toast.success("Agendamento criado a partir do orçamento!");
  };

  // Edit client
  const openEditClient = (clientId: string) => {
    const cl = clients.find(c => c.id === clientId);
    if (cl) { setEditClientData({...cl}); setEditClientOpen(true); }
  };

  const saveClientEdit = () => {
    if (!editClientData) return;
    const fullAddr = [editClientData.street, editClientData.number, editClientData.complement, editClientData.neighborhood, editClientData.city, editClientData.state].filter(Boolean).join(", ");
    const updated = clients.map(c => c.id === editClientData.id ? { ...editClientData, address: fullAddr } : c);
    db.saveClients(updated);
    setClients(updated);
    setEditClientOpen(false);
    toast.success("Cliente atualizado!");
  };

  const scheduleBusyTimes = scheduleForm.date ? getBusyTimes(scheduleForm.date) : [];

  const downloadPDF = (q: Quote) => {
    const company = db.getCompany();
    generateQuotePDF(q, company);
  };

  const downloadProposal = (q: Quote) => {
    const company = db.getCompany();
    generateProposalPDF(q, company);
  };

  const shareWhatsApp = (q: Quote) => {
    const company = db.getCompany();
    const sub = q.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
    const disc = q.discountType === "percent" ? sub * (q.discountValue / 100) : q.discountValue;
    const tot = Math.max(0, sub - disc);
    const text = `*Orçamento #${q.number} - ${company.name}*\n\nCliente: ${q.clientName}\nData: ${new Date(q.date + "T00:00").toLocaleDateString("pt-BR")}\n\nServiços:\n${q.services.map(s => `• ${s.name} - ${s.quantity}x R$ ${s.unitPrice.toFixed(2)} = R$ ${(s.quantity * s.unitPrice).toFixed(2)}`).join("\n")}\n\n${q.discountValue > 0 ? `Desconto: ${q.discountType === "percent" ? q.discountValue + "%" : "R$ " + q.discountValue.toFixed(2)}\n` : ""}*Total: R$ ${tot.toFixed(2)}*\n\nPagamento: ${paymentLabels[q.paymentMethod]}\nPrazo: ${q.executionDeadline}\nValidade: ${q.validityDays} dias`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const getQuoteTotal = (q: Quote) => {
    const sub = q.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
    const disc = q.discountType === "percent" ? sub * (q.discountValue / 100) : q.discountValue;
    return Math.max(0, sub - disc);
  };

  const statusColors: Record<string, string> = {
    pendente: "bg-warning/10 text-warning",
    aprovado: "bg-success/10 text-success",
    recusado: "bg-destructive/10 text-destructive",
  };
  const statusLabels: Record<string, string> = {
    pendente: "Pendente",
    aprovado: "Aprovado",
    recusado: "Recusado",
  };

  return (
    <PageShell
      title="Orçamentos"
      showBack
      action={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Orçamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {/* Client */}
              <div>
                <Label>Cliente *</Label>
                <Select onValueChange={v => {
                  const cl = clients.find(c => c.id === v);
                  setForm({ ...form, clientId: v, clientName: cl?.name || "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Services */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Serviços</Label>
                  <Button type="button" size="sm" variant="ghost" onClick={addService} className="gap-1 text-xs"><Plus className="h-3 w-3" /> Adicionar</Button>
                </div>
                <div className="space-y-3">
                  {form.services.map((s, i) => {
                    const selectedType = serviceTypes.find(t => t.name === s.name);
                    const isOther = s.name === '' || !serviceTypes.some(t => t.name === s.name);
                    const area = s.isAreaBased && s.length && s.width ? Math.round(s.length * s.width * 100) / 100 : 0;
                    const areaTotal = area && s.pricePerM2 ? Math.round(area * s.pricePerM2 * 100) / 100 : 0;

                    return (
                      <div key={s.id} className="rounded-lg bg-accent/50 p-3 space-y-2">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            {i === 0 && <span className="text-xs text-muted-foreground">Tipo de Serviço</span>}
                            <Select
                              value={serviceTypes.some(t => t.name === s.name) ? s.name : (s.name ? '__outro__' : '')}
                              onValueChange={v => {
                                if (v === '__outro__') {
                                  updateService(s.id, "name", customServiceNames[s.id] || "");
                                  updateService(s.id, "isAreaBased", false);
                                } else {
                                  selectServiceType(s.id, v);
                                }
                              }}
                            >
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                              <SelectContent>
                                {serviceTypes.map(st => (
                                  <SelectItem key={st.id} value={st.name}>{st.name}</SelectItem>
                                ))}
                                <SelectItem value="__outro__">📝 Outro (manual)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {form.services.length > 1 && (
                            <button onClick={() => removeService(s.id)} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>

                        {/* Custom name for "Outro" */}
                        {(!serviceTypes.some(t => t.name === s.name) && s.name !== '') && (
                          <Input value={s.name} onChange={e => { updateService(s.id, "name", e.target.value); setCustomServiceNames({...customServiceNames, [s.id]: e.target.value}); }} placeholder="Nome do serviço" className="h-9" />
                        )}
                        {(serviceTypes.some(t => t.name === s.name) && s.name === 'Outro') && (
                          <Input value={customServiceNames[s.id] || ''} onChange={e => { setCustomServiceNames({...customServiceNames, [s.id]: e.target.value}); updateService(s.id, "name", e.target.value || 'Outro'); }} placeholder="Descreva o serviço" className="h-9" />
                        )}

                        {/* Area-based fields for Tapete/Carpete */}
                        {s.isAreaBased ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-xs text-muted-foreground">Comprimento (m)</span>
                                <Input type="number" min={0} step="0.01" value={s.length || ""} onChange={e => updateService(s.id, "length", Math.max(0, parseFloat(e.target.value) || 0))} className="h-9" />
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Largura (m)</span>
                                <Input type="number" min={0} step="0.01" value={s.width || ""} onChange={e => updateService(s.id, "width", Math.max(0, parseFloat(e.target.value) || 0))} className="h-9" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-xs text-muted-foreground">Preço/m² (R$)</span>
                                <Input type="number" min={0} step="0.01" value={s.pricePerM2 || ""} onChange={e => updateService(s.id, "pricePerM2", Math.max(0, parseFloat(e.target.value) || 0))} className="h-9" />
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Qtd</span>
                                <Input type="number" min={1} value={s.quantity} onChange={e => updateService(s.id, "quantity", parseInt(e.target.value) || 1)} className="h-9" />
                              </div>
                            </div>
                            {area > 0 && (
                              <div className="rounded-md bg-primary/10 p-2 text-sm flex items-center gap-2">
                                <Ruler className="h-4 w-4 text-primary" />
                                <span className="text-primary font-medium">{area} m² × R$ {(s.pricePerM2 || 0).toFixed(2)} = <strong>R$ {areaTotal.toFixed(2)}</strong></span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <div className="w-16">
                              <span className="text-xs text-muted-foreground">Qtd</span>
                              <Input type="number" min={1} value={s.quantity} onChange={e => updateService(s.id, "quantity", parseInt(e.target.value) || 1)} className="h-9" />
                            </div>
                            <div className="flex-1">
                              <span className="text-xs text-muted-foreground">Valor (R$)</span>
                              <Input type="number" min={0} step="0.01" value={s.unitPrice || ""} onChange={e => updateService(s.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))} className="h-9" />
                            </div>
                          </div>
                        )}

                        {/* Service info hints */}
                        {selectedType && selectedType.avgExecutionMinutes > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Tempo estimado: {selectedType.avgExecutionMinutes} min</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discount */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Desconto</Label>
                  <Select value={form.discountType} onValueChange={v => setForm({ ...form, discountType: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor Desconto</Label>
                  <Input type="number" min={0} step="0.01" value={form.discountValue || ""} onChange={e => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-lg bg-accent p-3 space-y-1">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-sm text-destructive"><span>Desconto</span><span>-R$ {discount.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-primary text-lg"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
                {estimatedMinutes > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Tempo estimado</span>
                    <span>{Math.floor(estimatedMinutes / 60)}h{estimatedMinutes % 60 > 0 ? ` ${estimatedMinutes % 60}min` : ''}</span>
                  </div>
                )}
                {company.isPro && estimatedMargin > 0 && (
                  <div className="flex justify-between text-xs text-success pt-1">
                    <span>Lucro estimado</span>
                    <span>R$ {estimatedMargin.toFixed(2)}</span>
                  </div>
                )}
                {!company.isPro && estimatedMinutes > 0 && (
                  <p className="text-xs text-muted-foreground pt-1 text-center">💡 Gestão estratégica disponível na versão PRO</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><Label>Prazo de Execução</Label><Input value={form.executionDeadline} onChange={e => setForm({ ...form, executionDeadline: e.target.value })} placeholder="Ex: 2 dias" /></div>
                <div><Label>Validade (dias)</Label><Input type="number" min={1} value={form.validityDays} onChange={e => setForm({ ...form, validityDays: parseInt(e.target.value) || 5 })} /></div>
              </div>

              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm({ ...form, paymentMethod: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div><Label>Observações</Label><Textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>

              <Button onClick={save} className="w-full rounded-full">Criar Orçamento</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {quotes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>Nenhum orçamento criado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => (
            <div key={q.id} className="rounded-xl bg-card p-4 shadow-card animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">#{q.number}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[q.status]}`}>
                      {statusLabels[q.status]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-0.5">{q.clientName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(q.date + "T00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">R$ {getQuoteTotal(q).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{q.services.length} serviço(s)</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => setViewQuote(q)}>
                  <Eye className="h-3.5 w-3.5" /> Ver
                </Button>
                <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => downloadPDF(q)}>
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => shareWhatsApp(q)}>
                  <Send className="h-3.5 w-3.5" /> WhatsApp
                </Button>
                <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => downloadProposal(q)}>
                  <FileText className="h-3.5 w-3.5" /> Proposta
                </Button>
                {q.status === "pendente" && (
                  <>
                    <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs text-success" onClick={() => openScheduleDialog(q)}>
                      <CalendarPlus className="h-3.5 w-3.5" /> Agendar
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full gap-1 text-xs text-destructive" onClick={() => updateStatus(q.id, "recusado")}>
                      <X className="h-3.5 w-3.5" /> Recusar
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openEditQuote(q)}>
                  <Edit className="h-3.5 w-3.5" /> Editar
                </Button>
                {q.clientId && (
                  <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => openEditClient(q.clientId)}>
                    <User className="h-3.5 w-3.5" /> Cliente
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="rounded-full gap-1 text-xs text-destructive" onClick={() => removeQuote(q.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewQuote} onOpenChange={() => setViewQuote(null)}>
        <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          {viewQuote && (
            <>
              <DialogHeader>
                <DialogTitle>Orçamento #{viewQuote.number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Cliente:</span><p className="font-medium">{viewQuote.clientName}</p></div>
                  <div><span className="text-muted-foreground">Data:</span><p className="font-medium">{new Date(viewQuote.date + "T00:00").toLocaleDateString("pt-BR")}</p></div>
                  <div><span className="text-muted-foreground">Pagamento:</span><p className="font-medium">{paymentLabels[viewQuote.paymentMethod]}</p></div>
                  <div><span className="text-muted-foreground">Validade:</span><p className="font-medium">{viewQuote.validityDays} dias</p></div>
                  {viewQuote.executionDeadline && <div><span className="text-muted-foreground">Prazo:</span><p className="font-medium">{viewQuote.executionDeadline}</p></div>}
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-accent"><th className="p-2 text-left">Serviço</th><th className="p-2 text-center">Qtd</th><th className="p-2 text-right">Valor</th><th className="p-2 text-right">Subtotal</th></tr></thead>
                    <tbody>
                      {viewQuote.services.map(s => (
                        <tr key={s.id} className="border-t"><td className="p-2">{s.name}</td><td className="p-2 text-center">{s.quantity}</td><td className="p-2 text-right">R$ {s.unitPrice.toFixed(2)}</td><td className="p-2 text-right">R$ {(s.quantity * s.unitPrice).toFixed(2)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg bg-accent p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>R$ {viewQuote.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0).toFixed(2)}</span></div>
                  {viewQuote.discountValue > 0 && <div className="flex justify-between text-destructive"><span>Desconto</span><span>-R$ {(viewQuote.discountType === "percent" ? viewQuote.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0) * viewQuote.discountValue / 100 : viewQuote.discountValue).toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-primary text-lg"><span>Total</span><span>R$ {getQuoteTotal(viewQuote).toFixed(2)}</span></div>
                </div>

                {viewQuote.observations && <div className="text-sm"><span className="text-muted-foreground">Observações:</span><p>{viewQuote.observations}</p></div>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader><DialogTitle>📅 Agendar Serviço</DialogTitle></DialogHeader>
          {scheduleQuote && (
            <div className="space-y-3">
              <div className="rounded-lg bg-accent/50 p-3 text-sm">
                <p className="font-medium text-foreground">{scheduleQuote.clientName}</p>
                <p className="text-muted-foreground">{scheduleQuote.services.map(s => s.name).join(", ")}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><Label>Data *</Label><Input type="date" value={scheduleForm.date} onChange={e => setScheduleForm({...scheduleForm, date: e.target.value})} /></div>
                <div><Label>Horário</Label><Input type="time" value={scheduleForm.time} onChange={e => setScheduleForm({...scheduleForm, time: e.target.value})} /></div>
              </div>

              {scheduleBusyTimes.length > 0 && (
                <div className="rounded-lg bg-warning/10 border border-warning/20 p-2.5 text-xs">
                  <p className="font-medium text-warning mb-1">⚠️ Horários ocupados neste dia:</p>
                  <div className="flex flex-wrap gap-1">
                    {scheduleBusyTimes.map((t, i) => (
                      <span key={i} className="rounded-full bg-warning/20 px-2 py-0.5 text-warning font-medium">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {collaborators.length > 0 && (
                <div>
                  <Label>Técnico Responsável</Label>
                  <Select value={scheduleForm.technicianId} onValueChange={v => {
                    const col = collaborators.find(c => c.id === v);
                    setScheduleForm({...scheduleForm, technicianId: v, technicianName: col?.name || ""});
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                    <SelectContent>
                      {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.role}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div><Label>Observações</Label><Textarea value={scheduleForm.observations} onChange={e => setScheduleForm({...scheduleForm, observations: e.target.value})} /></div>
              <Button onClick={confirmSchedule} className="w-full rounded-full gap-2"><CalendarPlus className="h-4 w-4" /> Confirmar Agendamento</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Quote Dialog */}
      <Dialog open={editQuoteOpen} onOpenChange={o => { setEditQuoteOpen(o); if (!o) setEditingQuote(null); }}>
        <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Orçamento #{editingQuote?.number}</DialogTitle></DialogHeader>
          {editingQuote && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Serviços</Label>
                {editQuoteForm.services.map(s => (
                  <div key={s.id} className="rounded-lg bg-accent/50 p-3 space-y-2">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground">Serviço</span>
                        <Input value={s.name} onChange={e => updateEditService(s.id, "name", e.target.value)} className="h-9" />
                      </div>
                      <div className="w-16">
                        <span className="text-xs text-muted-foreground">Qtd</span>
                        <Input type="number" min={1} value={s.quantity} onChange={e => updateEditService(s.id, "quantity", parseInt(e.target.value) || 1)} className="h-9" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground">Valor (R$)</span>
                        <Input type="number" min={0} step="0.01" value={s.unitPrice || ""} onChange={e => updateEditService(s.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))} className="h-9" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Desconto</Label>
                  <Select value={editQuoteForm.discountType} onValueChange={v => setEditQuoteForm({ ...editQuoteForm, discountType: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input type="number" min={0} step="0.01" value={editQuoteForm.discountValue || ""} onChange={e => setEditQuoteForm({ ...editQuoteForm, discountValue: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><Label>Prazo</Label><Input value={editQuoteForm.executionDeadline} onChange={e => setEditQuoteForm({ ...editQuoteForm, executionDeadline: e.target.value })} /></div>
                <div><Label>Validade (dias)</Label><Input type="number" min={1} value={editQuoteForm.validityDays} onChange={e => setEditQuoteForm({ ...editQuoteForm, validityDays: parseInt(e.target.value) || 5 })} /></div>
              </div>

              <div>
                <Label>Pagamento</Label>
                <Select value={editQuoteForm.paymentMethod} onValueChange={v => setEditQuoteForm({ ...editQuoteForm, paymentMethod: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div><Label>Observações</Label><Textarea value={editQuoteForm.observations} onChange={e => setEditQuoteForm({ ...editQuoteForm, observations: e.target.value })} /></div>
              <Button onClick={saveEditQuote} className="w-full rounded-full">Salvar Alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
        <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader>
          {editClientData && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editClientData.name} onChange={e => setEditClientData({...editClientData, name: e.target.value})} /></div>
              <div><Label>Telefone</Label><Input value={editClientData.phone} onChange={e => setEditClientData({...editClientData, phone: e.target.value})} /></div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">📍 Endereço</p>
                <div><Label className="text-xs">Rua</Label><Input value={editClientData.street || ''} onChange={e => setEditClientData({...editClientData, street: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Número</Label><Input value={editClientData.number || ''} onChange={e => setEditClientData({...editClientData, number: e.target.value})} /></div>
                  <div><Label className="text-xs">Complemento</Label><Input value={editClientData.complement || ''} onChange={e => setEditClientData({...editClientData, complement: e.target.value})} /></div>
                </div>
                <div><Label className="text-xs">Bairro</Label><Input value={editClientData.neighborhood || ''} onChange={e => setEditClientData({...editClientData, neighborhood: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Cidade</Label><Input value={editClientData.city || ''} onChange={e => setEditClientData({...editClientData, city: e.target.value})} /></div>
                  <div>
                    <Label className="text-xs">Estado</Label>
                    <Select value={editClientData.state || ''} onValueChange={v => setEditClientData({...editClientData, state: v})}>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button onClick={saveClientEdit} className="w-full rounded-full">Salvar Cliente</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
