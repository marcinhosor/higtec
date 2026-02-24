import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Quote, CompanyInfo, Client, Collaborator, Appointment, ExecutionPhoto, NonConformity, ExecutionProduct } from "./storage";

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  parcelado: "Parcelado",
};

function renderHeader(doc: jsPDF, company: CompanyInfo, isPro: boolean): number {
  let y = 15;
  const companyName = isPro ? company.name : "Hig Clean Tec";

  if (isPro && company.logo) {
    try {
      doc.addImage(company.logo, "PNG", 15, y, 25, 25);
      y += 2;
    } catch { /* logo load failed */ }
  }

  const headerX = isPro && company.logo ? 45 : 15;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 205);
  doc.text(companyName, headerX, y + 6);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  let subY = y + 13;
  if (company.phone) { doc.text(`Tel: ${company.phone}`, headerX, subY); subY += 5; }
  if (isPro && company.cnpj) { doc.text(`CNPJ: ${company.cnpj}`, headerX, subY); subY += 5; }
  if (isPro && company.address) { doc.text(company.address, headerX, subY); subY += 5; }
  if (isPro && company.instagram) { doc.text(`@${company.instagram.replace('@', '')}`, headerX, subY); subY += 5; }

  y = Math.max(subY, y + 30) + 5;

  doc.setDrawColor(41, 128, 205);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);
  y += 8;

  return y;
}

function renderPaymentFooter(doc: jsPDF, company: CompanyInfo, y: number): number {
  const isPro = company.isPro;
  if (!isPro) return y;

  const hasBankData = company.bankData?.bankName;
  const primaryPix = (company.pixKeys || []).find(k => k.isPrimary);

  if (!hasBankData && !primaryPix) return y;

  if (y > 240) { doc.addPage(); y = 20; }

  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 205);
  doc.text("DADOS PARA PAGAMENTO", 15, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  if (hasBankData) {
    const b = company.bankData;
    doc.setFont("helvetica", "bold");
    doc.text("Dados Bancários:", 15, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    doc.text(`Banco: ${b.bankName}`, 15, y); y += 4;
    doc.text(`Agência: ${b.agency}  |  Conta: ${b.account} (${b.accountType === 'corrente' ? 'Corrente' : 'Poupança'})`, 15, y); y += 4;
    doc.text(`Titular: ${b.holderName}  |  Doc: ${b.holderDocument}`, 15, y); y += 6;
  }

  if (primaryPix) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 205);
    doc.text(`Chave Pix (Principal): ${primaryPix.value}`, 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("(QR Code Pix - disponível em breve)", 15, y);
    y += 5;
  }

  return y;
}

export function generateQuotePDF(quote: Quote, company: CompanyInfo) {
  const doc = new jsPDF();
  const isPro = company.isPro;
  const companyName = isPro ? company.name : "Hig Clean Tec";

  // Watermark for free version
  if (!isPro) {
    doc.setFontSize(50);
    doc.setTextColor(200, 220, 240);
    doc.text("HIG CLEAN TEC", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  let y = renderHeader(doc, company, isPro);

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(`ORÇAMENTO #${quote.number}`, 105, y, { align: "center" });
  y += 10;

  // Client info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Cliente: ${quote.clientName}`, 15, y);
  doc.text(`Data: ${new Date(quote.date + "T00:00").toLocaleDateString("pt-BR")}`, 140, y);
  y += 6;
  doc.text(`Validade: ${quote.validityDays} dias`, 15, y);
  if (quote.executionDeadline) { doc.text(`Prazo: ${quote.executionDeadline}`, 140, y); }
  y += 10;

  // Service table
  const sub = quote.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
  autoTable(doc, {
    startY: y,
    head: [["Serviço", "Qtd", "Valor Unit.", "Subtotal"]],
    body: quote.services.map(s => [
      s.name,
      String(s.quantity),
      `R$ ${s.unitPrice.toFixed(2)}`,
      `R$ ${(s.quantity * s.unitPrice).toFixed(2)}`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [41, 128, 205], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10 },
    margin: { left: 15, right: 15 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Totals
  doc.setFontSize(10);
  doc.text(`Subtotal: R$ ${sub.toFixed(2)}`, 140, y);
  y += 6;
  if (quote.discountValue > 0) {
    const disc = quote.discountType === "percent" ? sub * quote.discountValue / 100 : quote.discountValue;
    doc.setTextColor(200, 50, 50);
    doc.text(`Desconto: -R$ ${disc.toFixed(2)}`, 140, y);
    y += 6;
  }
  const totalVal = (() => {
    const d = quote.discountType === "percent" ? sub * quote.discountValue / 100 : quote.discountValue;
    return Math.max(0, sub - d);
  })();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 205);
  doc.text(`TOTAL: R$ ${totalVal.toFixed(2)}`, 140, y);
  y += 10;

  // Payment
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Forma de Pagamento: ${paymentLabels[quote.paymentMethod]}`, 15, y);
  y += 8;

  // Observations
  if (quote.observations) {
    doc.text("Observações:", 15, y);
    y += 5;
    const lines = doc.splitTextToSize(quote.observations, 175);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 5;
  }

  // Payment footer (PRO)
  y = renderPaymentFooter(doc, company, y);

  // Signature
  if (y < 250) y = 250;
  doc.setDrawColor(150, 150, 150);
  doc.line(30, y, 90, y);
  doc.line(120, y, 180, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(companyName, 60, y, { align: "center" });
  doc.text(quote.clientName, 150, y, { align: "center" });

  doc.save(`orcamento-${quote.number}.pdf`);
}

export function generateProposalPDF(quote: Quote, company: CompanyInfo) {
  const doc = new jsPDF();
  const isPro = company.isPro;
  const companyName = isPro ? company.name : "Hig Clean Tec";

  if (!isPro) {
    doc.setFontSize(50);
    doc.setTextColor(200, 220, 240);
    doc.text("HIG CLEAN TEC", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  let y = renderHeader(doc, company, isPro);

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("PROPOSTA COMERCIAL", 105, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Cliente: ${quote.clientName}`, 15, y);
  doc.text(`Data: ${new Date(quote.date + "T00:00").toLocaleDateString("pt-BR")}`, 140, y);
  y += 10;

  // Sections
  const addSection = (title: string, content: string) => {
    if (!content) return;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 205);
    doc.text(title, 15, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(content, 175);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 8;
  };

  addSection("Apresentação da Empresa", company.companyDescription || `${companyName} é especializada em higienização profissional de estofados, oferecendo serviços de alta qualidade com produtos e equipamentos profissionais.`);
  addSection("Diferenciais", company.differentials || "• Equipamentos profissionais de alta performance\n• Produtos de qualidade comprovada\n• Profissionais treinados e capacitados\n• Atendimento personalizado");
  addSection("Garantia do Serviço", company.serviceGuarantee || "Garantimos a qualidade do serviço prestado. Caso não fique satisfeito, refazemos o serviço sem custo adicional.");
  addSection("Método de Execução", company.executionMethod || "Utilizamos o método de extração por água quente (HWE), que é o mais eficiente para higienização profunda de estofados.");
  addSection("Recomendação Técnica", company.technicalRecommendation || "Recomendamos a higienização periódica dos estofados para manutenção da saúde e conservação do material.");

  // Services table
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 205);
  doc.text("Serviços Propostos", 15, y);
  y += 6;

  const sub = quote.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
  autoTable(doc, {
    startY: y,
    head: [["Serviço", "Qtd", "Valor"]],
    body: quote.services.map(s => [s.name, String(s.quantity), `R$ ${(s.quantity * s.unitPrice).toFixed(2)}`]),
    theme: "striped",
    headStyles: { fillColor: [41, 128, 205] },
    styles: { fontSize: 10 },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  const disc = quote.discountType === "percent" ? sub * quote.discountValue / 100 : quote.discountValue;
  const tot = Math.max(0, sub - disc);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 205);
  doc.text(`Investimento Total: R$ ${tot.toFixed(2)}`, 15, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Forma de Pagamento: ${paymentLabels[quote.paymentMethod]}`, 15, y);
  y += 5;
  doc.text(`Validade da proposta: ${quote.validityDays} dias`, 15, y);
  y += 10;

  // Payment footer (PRO)
  y = renderPaymentFooter(doc, company, y);

  // Signature
  if (y < 250) y = 250;
  doc.setDrawColor(150, 150, 150);
  doc.line(30, y, 90, y);
  doc.line(120, y, 180, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(companyName, 60, y, { align: "center" });
  doc.text(quote.clientName, 150, y, { align: "center" });

  doc.save(`proposta-comercial-${quote.number}.pdf`);
}

type ServiceReportData = {
  client: Client;
  form: {
    date: string;
    serviceType: string;
    soilingLevel: string;
    soilingType: string;
    productsUsed: string;
    dilutionApplied: string;
    volumeUsed: string;
    observations: string;
    technicianName: string;
    diagnosis: string;
    procedure: string;
    dilutionJustification: string;
    postServiceRecommendations: string;
  };
  suggestion: string;
  company: CompanyInfo;
  technician: Collaborator | null;
};

export function generateServiceReportPDF(data: ServiceReportData) {
  const { client, form, suggestion, company, technician } = data;
  const doc = new jsPDF();
  const isPro = company.isPro;
  const companyName = isPro ? company.name : "Hig Clean Tec";

  if (!isPro) {
    doc.setFontSize(50);
    doc.setTextColor(200, 220, 240);
    doc.text("HIG CLEAN TEC", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  let y = renderHeader(doc, company, isPro);

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("RELATÓRIO DE SERVIÇO", 105, y, { align: "center" });
  y += 10;

  // Client info table
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  const infoRows = [
    ["Cliente", client.name],
    ["Endereço", client.address || "Não informado"],
    ["Telefone", client.phone || "Não informado"],
    ["Data", new Date(form.date + "T00:00").toLocaleDateString("pt-BR")],
    ["Serviço", form.serviceType || "Não informado"],
  ];
  if (form.soilingLevel) infoRows.push(["Nível de Sujidade", form.soilingLevel]);
  if (form.soilingType) infoRows.push(["Tipo de Sujidade", form.soilingType]);
  if (form.technicianName) infoRows.push(["Técnico Responsável", form.technicianName]);

  autoTable(doc, {
    startY: y,
    body: infoRows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50, textColor: [100, 100, 100] } },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Products & dilution
  const addField = (label: string, value: string) => {
    if (!value) return;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 205);
    doc.setFontSize(11);
    doc.text(label, 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value, 175);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 6;
  };

  addField("Produtos Utilizados", form.productsUsed);
  if (form.dilutionApplied) addField("Diluição Aplicada", form.dilutionApplied);
  if (form.volumeUsed) addField("Volume Utilizado", form.volumeUsed);
  addField("Observações Técnicas", form.observations);

  // PRO: Technical description
  if (isPro) {
    if (form.diagnosis || form.procedure || form.dilutionJustification || form.postServiceRecommendations) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 205);
      doc.text("DESCRIÇÃO TÉCNICA DO PROCESSO", 15, y);
      y += 8;

      addField("Diagnóstico Inicial", form.diagnosis);
      addField("Procedimento Aplicado", form.procedure);
      addField("Justificativa da Diluição", form.dilutionJustification);
      addField("Recomendações Pós-serviço", form.postServiceRecommendations);
    }
  }

  // Maintenance suggestion
  if (form.serviceType) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(15, y - 2, 180, 12, 3, 3, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 205);
    doc.text(`Recomendação: nova higienização em ${suggestion}`, 20, y + 6);
    y += 18;
  }

  // Payment footer (PRO)
  y = renderPaymentFooter(doc, company, y);

  // Signature area
  if (y < 240) y = 240;
  if (y > 260) { doc.addPage(); y = 240; }

  doc.setDrawColor(150, 150, 150);
  doc.line(30, y, 90, y);
  doc.line(120, y, 180, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);

  // Technician signature
  if (isPro && technician?.signature) {
    try {
      doc.addImage(technician.signature, "PNG", 35, y - 25, 50, 18);
    } catch { /* signature load failed */ }
  }

  doc.text(form.technicianName || companyName, 60, y, { align: "center" });
  if (technician?.role) {
    y += 4;
    doc.text(technician.role, 60, y, { align: "center" });
  }

  doc.text(client.name, 150, y - (technician?.role ? 4 : 0), { align: "center" });

  doc.save(`relatorio-servico-${client.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

// =============================================
// EXECUTION REPORT PDF (with photos & non-conformities)
// =============================================

type ExecutionReportData = {
  appointment: Appointment;
  client: Client | null;
  photosBefore: ExecutionPhoto[];
  photosAfter: ExecutionPhoto[];
  nonConformities: NonConformity[];
  productsUsed: ExecutionProduct[];
  observations: string;
  processDescription: string;
  fiberType: string;
  soilingLevel: string;
  soilingType: string;
  totalMinutes: number;
  totalCost: number;
  company: CompanyInfo;
  startTime: string;
  endTime: string;
};

export function generateExecutionReportPDF(data: ExecutionReportData) {
  const { appointment, client, photosBefore, photosAfter, nonConformities, productsUsed, observations, processDescription, fiberType, soilingLevel, soilingType, totalMinutes, totalCost, company, startTime, endTime } = data;
  const doc = new jsPDF();
  const isPro = company.isPro;
  const companyName = isPro ? company.name : "Hig Clean Tec";

  if (!isPro) {
    doc.setFontSize(50);
    doc.setTextColor(200, 220, 240);
    doc.text("HIG CLEAN TEC", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  let y = renderHeader(doc, company, isPro);

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("RELATÓRIO DE EXECUÇÃO", 105, y, { align: "center" });
  y += 10;

  // Info table
  const infoRows: string[][] = [
    ["Cliente", appointment.clientName],
    ["Serviço", appointment.serviceType],
    ["Data", new Date(appointment.date + "T00:00").toLocaleDateString("pt-BR")],
    ["Técnico", appointment.technicianName || "-"],
  ];
  if (client) {
    const addr = client.street ? `${client.street}, ${client.number} - ${client.neighborhood}, ${client.city}/${client.state}` : client.address || "Não informado";
    infoRows.push(["Endereço", addr]);
    infoRows.push(["Telefone", client.phone || "-"]);
  }
  if (fiberType) infoRows.push(["Tipo de Fibra", fiberType]);
  if (soilingLevel) infoRows.push(["Nível de Sujidade", soilingLevel]);
  if (soilingType) infoRows.push(["Tipo de Sujidade", soilingType]);
  if (totalMinutes > 0) infoRows.push(["Tempo de Execução", `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`]);
  if (startTime) infoRows.push(["Início", new Date(startTime).toLocaleString("pt-BR")]);
  if (endTime) infoRows.push(["Término", new Date(endTime).toLocaleString("pt-BR")]);

  autoTable(doc, {
    startY: y,
    body: infoRows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50, textColor: [100, 100, 100] } },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  const addField = (label: string, value: string) => {
    if (!value) return;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 205);
    doc.setFontSize(11);
    doc.text(label, 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value, 175);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 6;
  };

  // Process description
  addField("Processo Realizado", processDescription);

  // Products used
  if (productsUsed.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 205);
    doc.text("Produtos Utilizados", 15, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Produto", "Diluição", "Solução (L)", "Concentrado (ml)"]],
      body: productsUsed.map(ep => [ep.productName, ep.dilution, String(ep.solutionVolumeLiters), String(ep.concentratedMl)]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 205], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    if (isPro && totalCost > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 205);
      doc.text(`Custo de insumos: R$ ${totalCost.toFixed(2)}`, 15, y);
      y += 8;
    }
  }

  // Observations
  addField("Observações Finais", observations);

  // Non-conformities
  if (nonConformities.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 50, 50);
    doc.text("⚠ REGISTRO DE NÃO CONFORMIDADES", 15, y);
    y += 7;

    autoTable(doc, {
      startY: y,
      head: [["Ocorrência", "Grau", "Descrição", "Cliente Ciente"]],
      body: nonConformities.map(nc => [
        nc.type,
        nc.severity.toUpperCase(),
        nc.description || "-",
        nc.clientAware ? "Sim" : "Não",
      ]),
      theme: "striped",
      headStyles: { fillColor: [200, 50, 50], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Photos section
  const addPhotos = (photos: ExecutionPhoto[], label: string) => {
    if (photos.length === 0) return;
    doc.addPage();
    y = 20;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 205);
    doc.text(`📷 Fotos - ${label}`, 15, y);
    y += 10;

    photos.forEach((photo, idx) => {
      if (y > 200) { doc.addPage(); y = 20; }

      try {
        // Label badge
        if (label === "ANTES") { doc.setFillColor(255, 200, 50); }
        else { doc.setFillColor(50, 200, 100); }
        doc.roundedRect(15, y - 4, 25, 8, 2, 2, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(label, 17, y + 1);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`Foto ${idx + 1} - ${new Date(photo.timestamp).toLocaleString("pt-BR")}`, 45, y + 1);
        y += 8;

        doc.addImage(photo.dataUrl, "JPEG", 15, y, 80, 60);
        if (photo.description) {
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          doc.text(photo.description, 100, y + 10);
        }
        y += 68;
      } catch {
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`[Foto ${idx + 1} não pôde ser carregada]`, 15, y);
        y += 10;
      }
    });
  };

  addPhotos(photosBefore, "ANTES");
  addPhotos(photosAfter, "DEPOIS");

  // Footer signature
  doc.addPage();
  y = 220;
  doc.setDrawColor(150, 150, 150);
  doc.line(30, y, 90, y);
  doc.line(120, y, 180, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(appointment.technicianName || companyName, 60, y, { align: "center" });
  doc.text(appointment.clientName, 150, y, { align: "center" });

  return doc;
}