import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import {
  generateId, ExecutionPhoto, NonConformity, ExecutionProduct,
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
import { useCompanyPlan } from "@/hooks/use-company-plan";
import { supabase } from "@/integrations/supabase/client";

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
  return `PROCESSO EXCLUSIVO

Mais do que limpeza, uma experiencia de cuidado.

Cada ${s} e tratado como uma peca de valor.
Nosso protocolo foi desenvolvido para atender clientes que exigem excelencia, discricao e resultados impecaveis.

1. Diagnostico Tecnico Personalizado
Realizamos uma analise minuciosa da peca, identificando o nivel de sujidade, tipos de manchas e caracteristicas especificas da fibra.
Cada tecido possui uma estrutura unica - e nosso cuidado comeca pelo respeito absoluto a essa individualidade.

2. Tratamento Especializado de Alta Performance
Selecionamos produtos profissionais de tecnologia avancada, adequados a composicao do material e ao grau de sujidade encontrado.
As solucoes sao aplicadas de forma tecnica e precisa, preservando textura, cor e maciez.

3. Tempo de Acao Controlado
Respeitamos o tempo tecnico ideal de cada ativo, permitindo que a formulacao atue profundamente na quebra das particulas impregnadas, preparando a superficie para uma remocao eficaz e segura.

4. Escovacao Tecnica Controlada
Executamos escovacao especializada, cuidadosamente calibrada para desprender a sujeira sem agredir as fibras, mantendo o acabamento original do estofado.

5. Enxague por Extracao Profunda
Utilizamos equipamentos profissionais de alta potencia para realizar a extracao completa dos residuos e da umidade, proporcionando limpeza uniforme, revitalizacao das fibras e toque renovado.

6. Finalizacao Sensorial Premium
Concluimos o processo com aplicacao de fragrancia sofisticada e exclusiva, deixando uma assinatura olfativa elegante no ambiente.

Tempo de Secagem
O ${s} estara completamente seco e pronto para uso em aproximadamente 4 a 8 horas, podendo variar conforme ventilacao, temperatura e tipo de tecido.`;
}

type CloudAppointment = {
  id: string;
  client_id: string;
  client_name: string;
  date: string;
  time: string;
  service: string;
  notes: string;
  status: string;
  collaborator_id: string;
  collaborator_name: string;
  company_id: string;
};

type CloudClient = {
  id: string;
  name: string;
  phone: string;
  address: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  property_type: string;
  observations: string;
  service_history: any;
};

type CloudCollaborator = {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: string;
};

type CloudProduct = {
  id: string;
  name: string;
  manufacturer: string;
  type: string;
  dilution: string;
  ph: number | null;
  cost_per_liter: number | null;
  current_stock_ml: number | null;
  min_stock_ml: number | null;
  stock_status: string;
  consumption_history: any;
  company_id: string;
};

export default function ServiceExecutionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get("appt") || "";

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<CloudAppointment | null>(null);
  const [client, setClient] = useState<CloudClient | null>(null);
  const [products, setProducts] = useState<CloudProduct[]>([]);
  const [collaborators, setCollaborators] = useState<CloudCollaborator[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const { isPro, companyId } = useCompanyPlan();

  // Company info for PDF
  const [companyInfo, setCompanyInfo] = useState<any>({});

  // Execution state
  const [executionId, setExecutionId] = useState<string | null>(null);
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

  // Load all data from cloud
  const loadData = useCallback(async () => {
    if (!companyId || !appointmentId) {
      setLoading(false);
      return;
    }

    try {
      // Load appointment, products, collaborators, company in parallel
      const [apptRes, prodsRes, collabRes, compRes] = await Promise.all([
        supabase.from("appointments").select("*").eq("id", appointmentId).eq("company_id", companyId).maybeSingle(),
        supabase.from("products").select("*").eq("company_id", companyId),
        supabase.from("collaborators").select("*").eq("company_id", companyId).eq("status", "ativo"),
        supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
      ]);

      if (apptRes.data) {
        setAppointment(apptRes.data as CloudAppointment);
        // Load client
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", apptRes.data.client_id)
          .eq("company_id", companyId)
          .maybeSingle();
        if (clientData) setClient(clientData as CloudClient);

        // Set technician from appointment
        if (apptRes.data.collaborator_name) {
          setSelectedTechnician(apptRes.data.collaborator_name);
        }
      }

      setProducts((prodsRes.data || []) as CloudProduct[]);
      setCollaborators((collabRes.data || []) as CloudCollaborator[]);

      if (compRes.data) {
        setCompanyInfo({
          name: compRes.data.name || '',
          phone: compRes.data.phone || '',
          cnpj: compRes.data.cnpj || '',
          logo: compRes.data.logo_url || '',
          address: compRes.data.address || '',
          instagram: compRes.data.instagram || '',
          signature: compRes.data.signature_url || '',
          isPro,
          companyDescription: compRes.data.company_description || '',
          differentials: compRes.data.differentials || '',
          serviceGuarantee: compRes.data.service_guarantee || '',
          executionMethod: compRes.data.execution_method || '',
          technicalRecommendation: compRes.data.technical_recommendation || '',
        });
      }

      // Load existing execution
      const { data: execData } = await supabase
        .from("service_executions")
        .select("*")
        .eq("appointment_id", appointmentId)
        .eq("company_id", companyId)
        .maybeSingle();

      if (execData) {
        setExecutionId(execData.id);
        setFiberType(execData.fiber_type || "");
        setSoilingLevel(execData.soiling_level || "");
        setSoilingType((execData.soiling_types as any)?.[0] || "");
        setPhotosBefore((execData.photos_before as any) || []);
        setPhotosAfter((execData.photos_after as any) || []);
        setNonConformities((execData.non_conformities as any) || []);
        setUsedProducts((execData.products_used as any) || []);
        setObservations(execData.observations || "");
        setProcessDesc(execData.process_description || "");
        setStartTime(execData.started_at || "");
        setEndTime(execData.finished_at || "");
        if (execData.collaborator_name) setSelectedTechnician(execData.collaborator_name);
        if (execData.status === "finalizado") setIsFinalized(true);
      }
    } catch (err) {
      console.error("Error loading execution data:", err);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [companyId, appointmentId, isPro]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-fill process description
  useEffect(() => {
    if (appointment?.service && !processDesc) {
      setProcessDesc(getDefaultProcess(appointment.service));
    }
  }, [appointment?.service]);

  const elapsedMinutes = useMemo(() => {
    if (!startTime) return 0;
    const end = endTime ? new Date(endTime) : new Date();
    return Math.round((end.getTime() - new Date(startTime).getTime()) / 60000);
  }, [startTime, endTime]);

  const totalCost = useMemo(() => {
    let cost = 0;
    usedProducts.forEach(ep => {
      const product = products.find(p => p.id === ep.productId);
      if (product?.cost_per_liter != null && product.cost_per_liter > 0) {
        const costPerMl = product.cost_per_liter / 1000;
        cost += costPerMl * ep.concentratedMl;
      }
    });
    return Math.round(cost * 100) / 100;
  }, [usedProducts, products]);

  if (loading) {
    return (
      <PageShell title="Execução" showBack>
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      </PageShell>
    );
  }

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

  // Compress image
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

  const handleStart = () => {
    setStartTime(new Date().toISOString());
    toast.success("Serviço iniciado!");
  };

  const handleStop = () => {
    setEndTime(new Date().toISOString());
    toast.success("Serviço finalizado!");
  };

  // Save execution to cloud
  const saveExecution = async (status: "in_progress" | "finalizado") => {
    if (!companyId) return;

    const techId = collaborators.find(c => c.name === selectedTechnician)?.id || appointment.collaborator_id || "";

    const execPayload = {
      appointment_id: appointmentId,
      company_id: companyId,
      collaborator_id: techId,
      collaborator_name: selectedTechnician || appointment.collaborator_name || "",
      fiber_type: fiberType,
      soiling_level: soilingLevel,
      soiling_types: [soilingType].filter(Boolean),
      photos_before: photosBefore as any,
      photos_after: photosAfter as any,
      non_conformities: nonConformities as any,
      products_used: usedProducts as any,
      observations,
      process_description: processDesc,
      started_at: startTime,
      finished_at: endTime,
      elapsed_seconds: elapsedMinutes * 60,
      status,
    };

    try {
      if (executionId) {
        const { error } = await supabase.from("service_executions").update(execPayload).eq("id", executionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("service_executions").insert(execPayload).select("id").single();
        if (error) throw error;
        setExecutionId(data.id);
      }

      // Deduct stock for products not yet deducted
      if (status === "finalizado" && isPro) {
        for (const ep of usedProducts) {
          if (!ep.deducted) {
            const product = products.find(p => p.id === ep.productId);
            if (product && product.current_stock_ml != null) {
              const newStock = Math.max(0, product.current_stock_ml - ep.concentratedMl);
              const history = Array.isArray(product.consumption_history) ? product.consumption_history : [];
              history.push({
                id: generateId(),
                date: new Date().toISOString(),
                volumeUsedMl: ep.concentratedMl,
                serviceDescription: `Execução: ${appointment.service} - ${appointment.client_name}`,
              });
              await supabase.from("products").update({
                current_stock_ml: newStock,
                consumption_history: history,
                stock_status: newStock <= (product.min_stock_ml || 0) ? 'critico' : newStock <= (product.current_stock_ml || 0) * 0.2 ? 'baixo' : 'ok',
              }).eq("id", ep.productId);
              ep.deducted = true;
            }
          }
        }
        setUsedProducts([...usedProducts]);
      }

      // Mark appointment as completed + update client history
      if (status === "finalizado") {
        await supabase.from("appointments").update({ status: "concluido" }).eq("id", appointmentId);

        if (client) {
          const history = Array.isArray(client.service_history) ? client.service_history : [];
          history.push({
            id: generateId(),
            date: new Date().toISOString(),
            serviceType: appointment.service,
            products: usedProducts.map(ep => ep.productName),
            observations: observations || processDesc.slice(0, 200),
            clientId: appointment.client_id,
            startTime,
            endTime,
            totalMinutes: elapsedMinutes,
            technicianName: selectedTechnician || appointment.collaborator_name,
          });
          await supabase.from("clients").update({ service_history: history }).eq("id", client.id);
        }

        toast.success("Serviço finalizado e salvo com sucesso!");
        setIsFinalized(true);
        return;
      }

      toast.success("Progresso salvo!");
    } catch (err) {
      console.error("Error saving execution:", err);
      toast.error("Erro ao salvar execução");
    }
  };

  // Generate execution report PDF
  const generateExecutionReport = (andShare = false) => {
    const apptForPdf = {
      id: appointment.id,
      clientId: appointment.client_id,
      clientName: appointment.client_name,
      date: appointment.date,
      time: appointment.time,
      serviceType: appointment.service || "",
      observations: appointment.notes || "",
      status: appointment.status as any,
      technicianId: appointment.collaborator_id || "",
      technicianName: selectedTechnician || appointment.collaborator_name || "",
    };

    const clientForPdf = client ? {
      id: client.id,
      name: client.name,
      phone: client.phone || "",
      address: client.address || "",
      street: client.street || "",
      number: client.number || "",
      complement: client.complement || "",
      neighborhood: client.neighborhood || "",
      city: client.city || "",
      state: client.state || "",
      propertyType: client.property_type || "",
      observations: client.observations || "",
      serviceHistory: [],
      createdAt: "",
    } : null;

    const doc = generateExecutionReportPDF({
      appointment: apptForPdf,
      client: clientForPdf,
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
      company: companyInfo,
      startTime,
      endTime,
    });

    const fileName = `relatorio-execucao-${appointment.client_name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;

    if (andShare) {
      const blob = doc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: `Relatório - ${appointment.client_name}`, text: `Relatório de execução do serviço de ${appointment.service}` })
          .then(() => toast.success("Relatório compartilhado!"))
          .catch(() => {});
        return;
      }

      doc.save(fileName);
      const clientPhone = client?.phone?.replace(/\D/g, '') || '';
      const whatsappNumber = clientPhone.startsWith('55') ? clientPhone : `55${clientPhone}`;
      const text = encodeURIComponent(`Olá ${appointment.client_name}! Segue o relatório do serviço de ${appointment.service} realizado. O PDF foi salvo no seu dispositivo.`);
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
          <h3 className="font-semibold text-foreground">{appointment.client_name}</h3>
          <p className="text-sm text-muted-foreground">{appointment.service} • {new Date(appointment.date + "T00:00").toLocaleDateString("pt-BR")} {appointment.time && `às ${appointment.time}`}</p>
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
          <Button className="w-full rounded-full gap-2" variant="outline" onClick={() => saveExecution("in_progress")}>
            <Package className="h-4 w-4" /> Salvar Progresso
          </Button>
          <Button
            className={`w-full rounded-full gap-2 transition-all ${isFinalized ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
            onClick={() => saveExecution("finalizado")}
            disabled={isFinalized}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isFinalized ? '✅ Serviço Finalizado' : 'Finalizar Serviço'}
            {!isFinalized && isPro && totalCost > 0 && <span className="text-xs opacity-80">(baixa estoque automática)</span>}
          </Button>
          {(endTime || isFinalized) && (
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
                      {p.name} {p.current_stock_ml != null ? `(${(p.current_stock_ml / 1000).toFixed(2)}L)` : ""}
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
