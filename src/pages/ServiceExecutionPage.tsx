import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import {
  db, generateId, Product, deductStock, Collaborator,
  ServiceExecution, ExecutionPhoto, NonConformity, ExecutionProduct,
} from "@/lib/storage";
import { generateExecutionReportPDF } from "@/lib/pdf-quote";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Camera, AlertTriangle, FlaskConical, Package, FileText,
  Play, Square, Clock, Trash2, Plus, ChevronDown, ChevronUp, CheckCircle2,
  Share2, User,
} from "lucide-react";
import { toast } from "sonner";

const Section = ({ id, icon, title, children, activeSection, setActiveSection }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode; activeSection: string; setActiveSection: (v: string) => void }) => {
  const isOpen = activeSection === id;
  return (
    <div className="rounded-xl bg-card shadow-card animate-fade-in overflow-hidden">
      <button onClick={() => setActiveSection(isOpen ? "" : id)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">{icon}</div>
          <span className="font-semibold text-foreground text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
};

const FIBER_TYPES = ["Tecido sintético", "Tecido natural", "Couro", "Couro sintético", "Veludo", "Suede", "Linho", "Microfibra", "Outro"];
const SOILING_LEVELS = ["Leve", "Moderado", "Pesado", "Crítico"];
const SOILING_TYPES = ["Gordura", "Mofo", "Poeira acumulada", "Mancha orgânica", "Urina", "Outros"];
const NC_TYPES = ["Rasgo", "Zíper danificado", "Mancha permanente", "Desgaste natural", "Sinistro (animal/urina/mofo)", "Defeito de fabricação", "Outro"];

function getDefaultProcess(serviceType: string) {
  const s = serviceType || "{serviço}";
  return `Fazemos a avaliação do seu ${s}, identificando o nível e o tipo de sujidade presente.\n\nAplicamos os produtos adequados de acordo com a fibra do tecido e o tipo de material, respeitando as características específicas da superfície.\n\nDeixamos os produtos agir pelo tempo necessário para melhor desempenho na remoção das sujidades.\n\nRealizamos escovação técnica para desprendimento da sujeira impregnada.\n\nEm seguida, efetuamos o enxágue por extração com máquinas de alta potência.\n\nApós a finalização, aplicamos um perfume premium.\n\nSeu ${s} leva de 4 a 8 horas para estar completamente seco e pronto para uso.`;
}

export default function ServiceExecutionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get("appt") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const isPro = useMemo(() => db.getCompany().isPro, []);
  const company = useMemo(() => db.getCompany(), []);

  const appointment = useMemo(() => {
    return db.getAppointments().find(a => a.id === appointmentId);
  }, [appointmentId]);

  const client = useMemo(() => {
    if (!appointment) return null;
    return db.getClients().find(c => c.id === appointment.clientId) || null;
  }, [appointment]);

  // Check for existing execution
  const [execution, setExecution] = useState<ServiceExecution | null>(null);

  useEffect(() => {
    setProducts(db.getProducts());
    setCollaborators(db.getCollaborators().filter(c => c.status === 'ativo'));
    if (appointment?.technicianName) setSelectedTechnician(appointment.technicianName);
    const existing = db.getExecutions().find(e => e.appointmentId === appointmentId);
    if (existing) {
      setExecution(existing);
      setFiberType(existing.fiberType);
      setSoilingLevel(existing.soilingLevel);
      setSoilingType(existing.soilingType);
      setPhotosBefore(existing.photosBefore);
      setPhotosAfter(existing.photosAfter);
      setNonConformities(existing.nonConformities);
      setUsedProducts(existing.productsUsed);
      setObservations(existing.observations);
      setProcessDesc(existing.processDescription);
      setStartTime(existing.startTime);
      setEndTime(existing.endTime);
      if (existing.technicianName) setSelectedTechnician(existing.technicianName);
    }
  }, [appointmentId, appointment]);

  // State
  const [activeSection, setActiveSection] = useState<string>("before");
  const [fiberType, setFiberType] = useState("");
  const [soilingLevel, setSoilingLevel] = useState("");
  const [soilingType, setSoilingType] = useState("");
  const [photosBefore, setPhotosBefore] = useState<ExecutionPhoto[]>([]);
  const [photosAfter, setPhotosAfter] = useState<ExecutionPhoto[]>([]);
  const [nonConformities, setNonConformities] = useState<NonConformity[]>([]);
  const [ncOpen, setNcOpen] = useState(false);
  const [ncForm, setNcForm] = useState({ type: "", severity: "leve" as NonConformity["severity"], description: "", clientAware: false, clientSignature: "" });
  const [usedProducts, setUsedProducts] = useState<ExecutionProduct[]>([]);
  const [prodOpen, setProdOpen] = useState(false);
  const [prodForm, setProdForm] = useState({ productId: "", dilution: "", solutionVolume: "" });
  const [observations, setObservations] = useState("");
  const [processDesc, setProcessDesc] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isFinalized, setIsFinalized] = useState(false);

  // Auto-fill process description when service type changes
  useEffect(() => {
    if (appointment?.serviceType && !processDesc) {
      setProcessDesc(getDefaultProcess(appointment.serviceType));
    }
  }, [appointment?.serviceType]);

  const elapsedMinutes = useMemo(() => {
    if (!startTime) return 0;
    const end = endTime ? new Date(endTime) : new Date();
    return Math.round((end.getTime() - new Date(startTime).getTime()) / 60000);
  }, [startTime, endTime]);

  const totalCost = useMemo(() => {
    let cost = 0;
    usedProducts.forEach(ep => {
      const product = products.find(p => p.id === ep.productId);
      if (product?.pricePaid != null && product?.volumeLiters != null && product.volumeLiters > 0) {
        const costPerMl = product.pricePaid / (product.volumeLiters * 1000);
        cost += costPerMl * ep.concentratedMl;
      }
    });
    return Math.round(cost * 100) / 100;
  }, [usedProducts, products]);

  if (!appointment) {
    return (
      <PageShell title="Execução" showBack>
        <div className="text-center py-12 text-muted-foreground">
          <p>Agendamento não encontrado.</p>
          <Button className="mt-4 rounded-full" onClick={() => navigate("/agenda")}>Voltar à Agenda</Button>
        </div>
      </PageShell>
    );
  }

  // Compress image to reduce localStorage usage
  const compressImage = (dataUrl: string, maxWidth = 800, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  };

  // Photo capture
  const capturePhoto = (phase: "before" | "after") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande (máx 5MB)");
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const compressed = await compressImage(reader.result as string);
        const photo: ExecutionPhoto = {
          id: generateId(),
          dataUrl: compressed,
          description: "",
          timestamp: new Date().toISOString(),
          phase,
        };
        if (phase === "before") setPhotosBefore(prev => [...prev, photo]);
        else setPhotosAfter(prev => [...prev, photo]);
        toast.success("Foto registrada!");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const removePhoto = (id: string, phase: "before" | "after") => {
    if (phase === "before") setPhotosBefore(prev => prev.filter(p => p.id !== id));
    else setPhotosAfter(prev => prev.filter(p => p.id !== id));
  };

  const updatePhotoDesc = (id: string, desc: string, phase: "before" | "after") => {
    const setter = phase === "before" ? setPhotosBefore : setPhotosAfter;
    setter(prev => prev.map(p => p.id === id ? { ...p, description: desc } : p));
  };

  // Non-conformity
  const addNonConformity = () => {
    if (!ncForm.type) { toast.error("Selecione o tipo de ocorrência"); return; }
    const nc: NonConformity = {
      ...ncForm,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    setNonConformities(prev => [...prev, nc]);
    setNcForm({ type: "", severity: "leve", description: "", clientAware: false, clientSignature: "" });
    setNcOpen(false);
    toast.success("Ocorrência registrada");
  };

  // Product / dilution
  const addProduct = () => {
    const product = products.find(p => p.id === prodForm.productId);
    if (!product) { toast.error("Selecione um produto"); return; }
    const parts = prodForm.dilution.split(":").map(s => parseFloat(s.trim()));
    const solVol = parseFloat(prodForm.solutionVolume);
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(solVol) || parts[1] <= 0) {
      toast.error("Preencha diluição (ex: 1:40) e volume de solução");
      return;
    }
    const ratio = parts[1] / parts[0];
    const concentratedMl = Math.round((solVol / ratio) * 1000 * 100) / 100;
    const waterLiters = Math.round((solVol - solVol / ratio) * 1000) / 1000;

    const ep: ExecutionProduct = {
      id: generateId(),
      productId: product.id,
      productName: product.name,
      dilution: prodForm.dilution,
      solutionVolumeLiters: solVol,
      concentratedMl,
      waterLiters,
      deducted: false,
    };
    setUsedProducts(prev => [...prev, ep]);
    setProdForm({ productId: "", dilution: "", solutionVolume: "" });
    setProdOpen(false);
    toast.success(`${product.name}: ${concentratedMl}ml de concentrado + ${waterLiters.toFixed(2)}L de água`);
  };

  const removeProduct = (id: string) => setUsedProducts(prev => prev.filter(p => p.id !== id));

  // Start/stop timer
  const handleStart = () => {
    setStartTime(new Date().toISOString());
    toast.success("Serviço iniciado!");
  };

  const handleStop = () => {
    setEndTime(new Date().toISOString());
    toast.success("Serviço finalizado!");
  };


  // Save execution
  const saveExecution = (status: ServiceExecution["status"]) => {
    const exec: ServiceExecution = {
      id: execution?.id || generateId(),
      appointmentId,
      clientId: appointment.clientId,
      clientName: appointment.clientName,
      serviceType: appointment.serviceType,
      technicianId: collaborators.find(c => c.name === selectedTechnician)?.id || appointment.technicianId,
      technicianName: selectedTechnician || appointment.technicianName,
      fiberType,
      soilingLevel,
      soilingType,
      photosBefore,
      photosAfter,
      nonConformities,
      productsUsed: usedProducts,
      observations,
      processDescription: processDesc,
      startTime,
      endTime,
      totalMinutes: elapsedMinutes,
      totalCost,
      status,
      createdAt: execution?.createdAt || new Date().toISOString(),
    };

    const execs = db.getExecutions().filter(e => e.id !== exec.id);
    execs.push(exec);
    const saved = db.saveExecutions(execs);
    if (!saved) {
      // Try saving without photos to avoid quota error
      const execNoPhotos = { ...exec, photosBefore: [], photosAfter: [] };
      const execs2 = db.getExecutions().filter(e => e.id !== exec.id);
      execs2.push(execNoPhotos);
      const retry = db.saveExecutions(execs2);
      if (!retry) {
        toast.error("Armazenamento cheio! Exclua execuções antigas em Configurações para liberar espaço.");
        return;
      }
      toast.warning("Salvo sem fotos — armazenamento quase cheio. Considere exportar seus dados.");
    }
    setExecution(exec);

    // Deduct stock for products not yet deducted
    if (status === "finalizado" && isPro) {
      usedProducts.forEach(ep => {
        if (!ep.deducted) {
          deductStock(ep.productId, ep.concentratedMl, `Execução: ${appointment.serviceType} - ${appointment.clientName}`);
          ep.deducted = true;
        }
      });
      setUsedProducts([...usedProducts]);
      setProducts(db.getProducts());
    }

    // Mark appointment as completed and add to client service history
    if (status === "finalizado") {
      const appts = db.getAppointments();
      const updated = appts.map(a => a.id === appointmentId ? { ...a, status: "concluido" as const } : a);
      db.saveAppointments(updated);

      // Register in client's service history
      const clients = db.getClients();
      const cIdx = clients.findIndex(c => c.id === appointment.clientId);
      if (cIdx !== -1) {
        const productNames = usedProducts.map(ep => ep.productName);
        const serviceRecord = {
          id: generateId(),
          date: new Date().toISOString(),
          serviceType: appointment.serviceType,
          products: productNames,
          observations: observations || processDesc.slice(0, 200),
          clientId: appointment.clientId,
          startTime,
          endTime,
          totalMinutes: elapsedMinutes,
          technicianName: selectedTechnician || appointment.technicianName,
        };
        clients[cIdx].serviceHistory = [...(clients[cIdx].serviceHistory || []), serviceRecord];
        db.saveClients(clients);
      }

      toast.success("Serviço finalizado e salvo com sucesso!");
      // Don't navigate immediately — let user generate report / share
      return;
    }

    toast.success("Progresso salvo!");
  };

  // Generate execution report PDF — returns jsPDF doc
  const generateExecutionReport = (andShare = false) => {
    // Allow generating even if not finalized, save current state first
    const doc = generateExecutionReportPDF({
      appointment: { ...appointment, technicianName: selectedTechnician || appointment.technicianName },
      client,
      photosBefore,
      photosAfter,
      nonConformities,
      productsUsed: usedProducts,
      observations,
      processDescription: processDesc,
      fiberType,
      soilingLevel,
      soilingType,
      totalMinutes: elapsedMinutes,
      totalCost,
      company,
      startTime,
      endTime,
    });

    const fileName = `relatorio-execucao-${appointment.clientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;

    if (andShare) {
      const blob = doc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });

      // Try Web Share API first
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: `Relatório - ${appointment.clientName}`, text: `Relatório de execução do serviço de ${appointment.serviceType}` })
          .then(() => toast.success("Relatório compartilhado!"))
          .catch(() => {});
        return;
      }

      // Fallback: open WhatsApp with download
      doc.save(fileName);
      const clientPhone = client?.phone?.replace(/\D/g, '') || '';
      const whatsappNumber = clientPhone.startsWith('55') ? clientPhone : `55${clientPhone}`;
      const text = encodeURIComponent(`Olá ${appointment.clientName}! Segue o relatório do serviço de ${appointment.serviceType} realizado. O PDF foi salvo no seu dispositivo.`);
      if (clientPhone) {
        window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
      } else {
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
      return;
    }

    doc.save(fileName);
    toast.success("Relatório gerado!");
  };

  return (
    <PageShell title="Execução do Serviço" showBack>
      <div className="mx-auto max-w-md space-y-3 pb-4">
        {/* Header info */}
        <div className="rounded-xl bg-card p-4 shadow-card border-l-4 border-l-primary">
          <h3 className="font-semibold text-foreground">{appointment.clientName}</h3>
          <p className="text-sm text-muted-foreground">{appointment.serviceType} • {new Date(appointment.date + "T00:00").toLocaleDateString("pt-BR")} {appointment.time && `às ${appointment.time}`}</p>
          {client && (
            <p className="text-xs text-muted-foreground mt-1">📍 {client.street ? `${client.street}, ${client.number} - ${client.neighborhood}, ${client.city}/${client.state}` : client.address || "Sem endereço"}</p>
          )}
          {/* Collaborator selector */}
          <div className="mt-3">
            <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Colaborador responsável</Label>
            {collaborators.length > 0 ? (
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {collaborators.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name} {c.role ? `(${c.role})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={selectedTechnician}
                onChange={e => setSelectedTechnician(e.target.value)}
                placeholder="Nome do colaborador"
                className="mt-1 h-9"
              />
            )}
          </div>
        </div>

        {/* Timer */}
        <div className="rounded-xl bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Tempo de execução</p>
                <p className="text-2xl font-bold text-primary">{Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}min</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!startTime ? (
                <Button size="sm" className="rounded-full gap-1" onClick={handleStart}><Play className="h-4 w-4" /> Iniciar</Button>
              ) : !endTime ? (
                <Button size="sm" variant="destructive" className="rounded-full gap-1" onClick={handleStop}><Square className="h-4 w-4" /> Parar</Button>
              ) : (
                <span className="text-xs text-success font-medium flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Concluído</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: BEFORE photos */}
        <Section id="before" icon={<Camera className="h-4 w-4 text-primary" />} title="📷 Fotos ANTES" activeSection={activeSection} setActiveSection={setActiveSection}>
          <div>
            <div className="grid grid-cols-3 gap-2">
              {photosBefore.map(p => (
                <div key={p.id} className="relative group">
                  <img src={p.dataUrl} alt="Antes" className="h-24 w-full rounded-lg object-cover" />
                  <button onClick={() => removePhoto(p.id, "before")} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <Input
                    placeholder="Descrição..."
                    value={p.description}
                    onChange={e => updatePhotoDesc(p.id, e.target.value, "before")}
                    className="mt-1 text-xs h-7"
                  />
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full rounded-full mt-3 gap-2" onClick={() => capturePhoto("before")}>
              <Camera className="h-4 w-4" /> Tirar Foto (Antes)
            </Button>
          </div>

          <div className="space-y-2">
            <div>
              <Label className="text-xs">Tipo de fibra</Label>
              <Select value={fiberType} onValueChange={setFiberType}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{FIBER_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Nível de sujidade</Label>
                <Select value={soilingLevel} onValueChange={setSoilingLevel}>
                  <SelectTrigger><SelectValue placeholder="Nível" /></SelectTrigger>
                  <SelectContent>{SOILING_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo de sujidade</Label>
                <Select value={soilingType} onValueChange={setSoilingType}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>{SOILING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Section>

        {/* Section 2: Non-conformity */}
        <Section id="nc" icon={<AlertTriangle className="h-4 w-4 text-warning" />} title="⚠️ Ocorrências / Não Conformidade" activeSection={activeSection} setActiveSection={setActiveSection}>
          {nonConformities.map(nc => (
            <div key={nc.id} className="rounded-lg border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{nc.type}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  nc.severity === "grave" ? "bg-destructive/10 text-destructive" :
                  nc.severity === "moderado" ? "bg-warning/10 text-warning" :
                  "bg-accent text-accent-foreground"
                }`}>{nc.severity}</span>
              </div>
              {nc.description && <p className="text-muted-foreground">{nc.description}</p>}
              <p className="text-xs text-muted-foreground">{nc.clientAware ? "✅ Cliente ciente" : "❌ Cliente não informado"}</p>
            </div>
          ))}
          <Button variant="outline" className="w-full rounded-full gap-2" onClick={() => setNcOpen(true)}>
            <AlertTriangle className="h-4 w-4" /> Registrar Não Conformidade
          </Button>
        </Section>

        {/* Section 3: Products & Dilution */}
        <Section id="products" icon={<FlaskConical className="h-4 w-4 text-primary" />} title="🧪 Produtos e Diluição" activeSection={activeSection} setActiveSection={setActiveSection}>
          {fiberType && soilingLevel && (
            <div className="rounded-lg bg-accent/50 border border-border p-3 text-xs">
              <p className="font-medium text-foreground mb-1">💡 Sugestão para {fiberType} com sujidade {soilingLevel}:</p>
              <p className="text-muted-foreground">
                {soilingLevel === "Leve" || soilingLevel === "Moderado"
                  ? "Diluição padrão do fabricante. Escovação leve."
                  : "Diluição concentrada (dobrar dose). Escovação pesada + tempo de ação prolongado."}
              </p>
            </div>
          )}
          {usedProducts.map(ep => (
            <div key={ep.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{ep.productName}</span>
                <button onClick={() => removeProduct(ep.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <p className="text-xs text-muted-foreground">Diluição {ep.dilution} • {ep.solutionVolumeLiters}L de solução</p>
              <p className="text-xs text-primary font-medium">→ {ep.concentratedMl}ml de concentrado + {ep.waterLiters.toFixed(2)}L de água</p>
              {ep.deducted && <p className="text-xs text-success mt-1">✅ Baixa no estoque registrada</p>}
            </div>
          ))}
          <Button variant="outline" className="w-full rounded-full gap-2" onClick={() => setProdOpen(true)}>
            <Plus className="h-4 w-4" /> Adicionar Produto
          </Button>
          {isPro && totalCost > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">Custo estimado de insumos</p>
              <p className="text-lg font-bold text-primary">R$ {totalCost.toFixed(2)}</p>
            </div>
          )}
        </Section>

        {/* Section 4: AFTER photos */}
        <Section id="after" icon={<Camera className="h-4 w-4 text-success" />} title="📸 Fotos DEPOIS" activeSection={activeSection} setActiveSection={setActiveSection}>
          <div className="grid grid-cols-3 gap-2">
            {photosAfter.map(p => (
              <div key={p.id} className="relative group">
                <img src={p.dataUrl} alt="Depois" className="h-24 w-full rounded-lg object-cover" />
                <button onClick={() => removePhoto(p.id, "after")} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-3 w-3" />
                </button>
                <Input
                  placeholder="Descrição..."
                  value={p.description}
                  onChange={e => updatePhotoDesc(p.id, e.target.value, "after")}
                  className="mt-1 text-xs h-7"
                />
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full rounded-full mt-2 gap-2" onClick={() => capturePhoto("after")}>
            <Camera className="h-4 w-4" /> Tirar Foto (Depois)
          </Button>
          <div>
            <Label className="text-xs">Observações finais</Label>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Observações sobre o resultado..." rows={2} />
          </div>
        </Section>

        {/* Section 5: Process Report */}
        <Section id="report" icon={<FileText className="h-4 w-4 text-primary" />} title="📄 Descrição do Processo" activeSection={activeSection} setActiveSection={setActiveSection}>
          <Textarea
            value={processDesc}
            onChange={e => setProcessDesc(e.target.value)}
            rows={10}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">Este texto será incluído no relatório técnico do cliente.</p>
        </Section>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <Button className="w-full rounded-full gap-2" variant="outline" onClick={() => saveExecution("em_andamento")}>
            <Package className="h-4 w-4" /> Salvar Progresso
          </Button>
          <Button
            className={`w-full rounded-full gap-2 transition-all ${isFinalized ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
            onClick={() => {
              saveExecution("finalizado");
              setIsFinalized(true);
            }}
            disabled={isFinalized}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isFinalized ? '✅ Serviço Finalizado' : 'Finalizar Serviço'}
            {!isFinalized && isPro && totalCost > 0 && <span className="text-xs opacity-80">(baixa estoque automática)</span>}
          </Button>
          {(endTime || execution?.status === "finalizado") && (
            <>
              <Button className="w-full rounded-full gap-2" variant="outline" onClick={() => generateExecutionReport(false)}>
                <FileText className="h-4 w-4" /> 📄 Gerar Relatório com Fotos
              </Button>
              <Button className="w-full rounded-full gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => generateExecutionReport(true)}>
                <Share2 className="h-4 w-4" /> Compartilhar via WhatsApp
              </Button>
            </>
          )}
        </div>
      </div>

      {/* NC Dialog */}
      <Dialog open={ncOpen} onOpenChange={setNcOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader><DialogTitle>Registrar Não Conformidade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo de Ocorrência</Label>
              <Select value={ncForm.type} onValueChange={v => setNcForm({ ...ncForm, type: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{NC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grau</Label>
              <Select value={ncForm.severity} onValueChange={(v: NonConformity["severity"]) => setNcForm({ ...ncForm, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={ncForm.description} onChange={e => setNcForm({ ...ncForm, description: e.target.value })} placeholder="Detalhe a ocorrência..." rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={ncForm.clientAware} onCheckedChange={v => setNcForm({ ...ncForm, clientAware: !!v })} />
              <Label className="text-sm">Cliente está ciente da ocorrência</Label>
            </div>
            <Button onClick={addNonConformity} className="w-full rounded-full">Registrar Ocorrência</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={prodOpen} onOpenChange={setProdOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader><DialogTitle>Adicionar Produto Utilizado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Produto</Label>
              <Select value={prodForm.productId} onValueChange={v => setProdForm({ ...prodForm, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.availableVolume != null ? `(${p.availableVolume.toFixed(2)}L)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Diluição</Label>
              <Input value={prodForm.dilution} onChange={e => setProdForm({ ...prodForm, dilution: e.target.value })} placeholder="Ex: 1:40" />
              <p className="text-xs text-muted-foreground mt-1">Formato: 1:10, 1:20, 1:40...</p>
            </div>
            <div>
              <Label>Volume total de solução (litros)</Label>
              <Input type="number" value={prodForm.solutionVolume} onChange={e => setProdForm({ ...prodForm, solutionVolume: e.target.value })} placeholder="Ex: 5" />
            </div>
            {prodForm.dilution && prodForm.solutionVolume && (() => {
              const parts = prodForm.dilution.split(":").map(s => parseFloat(s.trim()));
              const vol = parseFloat(prodForm.solutionVolume);
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(vol) && parts[1] > 0) {
                const ratio = parts[1] / parts[0];
                const ml = Math.round((vol / ratio) * 1000 * 100) / 100;
                return (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-center animate-fade-in">
                    <p className="text-xs text-muted-foreground">Concentrado necessário</p>
                    <p className="text-xl font-bold text-primary">{ml} ml</p>
                    <p className="text-xs text-muted-foreground">Água: {(vol - vol / ratio).toFixed(2)}L</p>
                  </div>
                );
              }
              return null;
            })()}
            <Button onClick={addProduct} className="w-full rounded-full">Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
