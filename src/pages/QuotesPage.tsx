import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { db, Quote, QuoteServiceItem, generateId } from "@/lib/storage";
import { Plus, Trash2, FileText, Send, CalendarPlus, Eye, Check, X, Clock } from "lucide-react";
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

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients] = useState(() => db.getClients());
  const [open, setOpen] = useState(false);
  const [viewQuote, setViewQuote] = useState<Quote | null>(null);

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

  const subtotal = form.services.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
  const discount = form.discountType === "percent" ? subtotal * (form.discountValue / 100) : form.discountValue;
  const total = Math.max(0, subtotal - discount);

  const addService = () => setForm({ ...form, services: [...form.services, emptyService()] });
  const removeService = (id: string) => setForm({ ...form, services: form.services.filter(s => s.id !== id) });
  const updateService = (id: string, field: keyof QuoteServiceItem, value: any) => {
    setForm({ ...form, services: form.services.map(s => s.id === id ? { ...s, [field]: value } : s) });
  };

  const save = () => {
    if (!form.clientName.trim()) { toast.error("Selecione um cliente"); return; }
    if (form.services.every(s => !s.name.trim())) { toast.error("Adicione ao menos um serviço"); return; }

    const quote: Quote = {
      id: generateId(),
      number: db.nextQuoteNumber(),
      date: new Date().toISOString().split("T")[0],
      clientId: form.clientId,
      clientName: form.clientName,
      services: form.services.filter(s => s.name.trim()),
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

  const convertToAppointment = (q: Quote) => {
    const appointments = db.getAppointments();
    const appt = {
      id: generateId(),
      clientId: q.clientId,
      clientName: q.clientName,
      date: new Date().toISOString().split("T")[0],
      time: "08:00",
      serviceType: q.services.map(s => s.name).join(", "),
      observations: `Orçamento #${q.number} - ${q.observations}`,
      status: "agendado" as const,
      technicianId: "",
      technicianName: "",
    };
    db.saveAppointments([...appointments, appt]);
    updateStatus(q.id, "aprovado");
    toast.success("Agendamento criado a partir do orçamento!");
  };

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
                <div className="space-y-2">
                  {form.services.map((s, i) => (
                    <div key={s.id} className="flex gap-2 items-end rounded-lg bg-accent/50 p-2">
                      <div className="flex-1">
                        {i === 0 && <span className="text-xs text-muted-foreground">Serviço</span>}
                        <Input value={s.name} onChange={e => updateService(s.id, "name", e.target.value)} placeholder="Nome do serviço" className="h-9" />
                      </div>
                      <div className="w-16">
                        {i === 0 && <span className="text-xs text-muted-foreground">Qtd</span>}
                        <Input type="number" min={1} value={s.quantity} onChange={e => updateService(s.id, "quantity", parseInt(e.target.value) || 1)} className="h-9" />
                      </div>
                      <div className="w-24">
                        {i === 0 && <span className="text-xs text-muted-foreground">Valor (R$)</span>}
                        <Input type="number" min={0} step="0.01" value={s.unitPrice || ""} onChange={e => updateService(s.id, "unitPrice", parseFloat(e.target.value) || 0)} className="h-9" />
                      </div>
                      {form.services.length > 1 && (
                        <button onClick={() => removeService(s.id)} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
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
                    <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs text-success" onClick={() => convertToAppointment(q)}>
                      <CalendarPlus className="h-3.5 w-3.5" /> Agendar
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full gap-1 text-xs text-destructive" onClick={() => updateStatus(q.id, "recusado")}>
                      <X className="h-3.5 w-3.5" /> Recusar
                    </Button>
                  </>
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
    </PageShell>
  );
}
