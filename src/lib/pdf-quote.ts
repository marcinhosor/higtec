import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Quote, CompanyInfo, Client, Collaborator, Appointment, ExecutionPhoto, NonConformity, ExecutionProduct, THEME_PALETTES, type ThemePalette } from "./storage";

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  parcelado: "Parcelado",
};

function getCompanyTheme(company: CompanyInfo): ThemePalette {
  const canUse = company.isPro || company.planTier === 'pro' || company.planTier === 'premium';
  if (!canUse) return THEME_PALETTES[0];
  return THEME_PALETTES.find(t => t.id === company.selectedThemeId) || THEME_PALETTES[0];
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

type TC = [number, number, number];

function renderHeader(doc: jsPDF, company: CompanyInfo, isPro: boolean): number {
  let y = 15;
  const companyName = isPro ? company.name : "Hig Clean Tec";
  const theme = getCompanyTheme(company);
  const tc: TC = hexToRgb(theme.primary);

  // PRO/PREMIUM: Company logo centered at top
  if (isPro && company.logo) {
    try {
      const logoW = 40, logoH = 40;
      doc.addImage(company.logo, "PNG", (210 - logoW) / 2, y, logoW, logoH);
      y += logoH + 4;
    } catch { /* logo load failed */ }
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...tc);
  doc.text(companyName, 105, y, { align: "center" });
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const subLines: string[] = [];
  if (company.phone) subLines.push(`Tel: ${company.phone}`);
  if (isPro && company.cnpj) subLines.push(`CNPJ: ${company.cnpj}`);
  if (isPro && company.address) subLines.push(company.address);
  if (isPro && company.instagram) subLines.push(`@${company.instagram.replace('@', '')}`);
  subLines.forEach(line => { doc.text(line, 105, y, { align: "center" }); y += 4; });

  y += 4;
  doc.setDrawColor(...tc);
  doc.setLineWidth(0.7);
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

  const tc: TC = hexToRgb(getCompanyTheme(company).primary);

  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...tc);
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
    doc.setTextColor(...tc);
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
  const tc: TC = hexToRgb(getCompanyTheme(company).primary);

  if (!isPro) {
    doc.setFontSize(50);
    doc.setTextColor(200, 220, 240);
    doc.text("HIG CLEAN TEC", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  let y = renderHeader(doc, company, isPro);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(`ORÇAMENTO #${quote.number}`, 105, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Cliente: ${quote.clientName}`, 15, y);
  doc.text(`Data: ${new Date(quote.date + "T00:00").toLocaleDateString("pt-BR")}`, 140, y);
  y += 6;
  doc.text(`Validade: ${quote.validityDays} dias`, 15, y);
  if (quote.executionDeadline) { doc.text(`Prazo: ${quote.executionDeadline}`, 140, y); }
  y += 10;

  const sub = quote.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
  autoTable(doc, {
    startY: y,
    head: [["Serviço", "Qtd", "Valor Unit.", "Subtotal"]],
    body: quote.services.map(s => [
      s.name, String(s.quantity), `R$ ${s.unitPrice.toFixed(2)}`, `R$ ${(s.quantity * s.unitPrice).toFixed(2)}`,
    ]),
    theme: "striped",
    headStyles: { fillColor: tc, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10 },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

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
  doc.setTextColor(...tc);
  doc.text(`TOTAL: R$ ${totalVal.toFixed(2)}`, 140, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Forma de Pagamento: ${paymentLabels[quote.paymentMethod]}`, 15, y);
  y += 8;

  if (quote.observations) {
    doc.text("Observações:", 15, y);
    y += 5;
    const lines = doc.splitTextToSize(quote.observations, 175);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 5;
  }

  y = renderPaymentFooter(doc, company, y);

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
  const tc: TC = hexToRgb(getCompanyTheme(company).primary);

  if (!isPro) {
    doc.setFontSize(50);
    doc.setTextColor(200, 220, 240);
    doc.text("HIG CLEAN TEC", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  let y = renderHeader(doc, company, isPro);

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

  const addSection = (title: string, content: string) => {
    if (!content) return;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...tc);
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

  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...tc);
  doc.text("Serviços Propostos", 15, y);
  y += 6;

  const sub = quote.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
  autoTable(doc, {
    startY: y,
    head: [["Serviço", "Qtd", "Valor"]],
    body: quote.services.map(s => [s.name, String(s.quantity), `R$ ${(s.quantity * s.unitPrice).toFixed(2)}`]),
    theme: "striped",
    headStyles: { fillColor: tc },
    styles: { fontSize: 10 },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  const disc = quote.discountType === "percent" ? sub * quote.discountValue / 100 : quote.discountValue;
  const tot = Math.max(0, sub - disc);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...tc);
  doc.text(`Investimento Total: R$ ${tot.toFixed(2)}`, 15, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Forma de Pagamento: ${paymentLabels[quote.paymentMethod]}`, 15, y);
  y += 5;
  doc.text(`Validade da proposta: ${quote.validityDays} dias`, 15, y);
  y += 10;

  y = renderPaymentFooter(doc, company, y);

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
  const tc: TC = hexToRgb(getCompanyTheme(company).primary);

  if (!isPro) {
    doc.setFontSize(50);
    doc.setTextColor(200, 220, 240);
    doc.text("HIG CLEAN TEC", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  let y = renderHeader(doc, company, isPro);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("RELATÓRIO DE SERVIÇO", 105, y, { align: "center" });
  y += 10;

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

  const addField = (label: string, value: string) => {
    if (!value) return;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...tc);
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

  if (isPro) {
    if (form.diagnosis || form.procedure || form.dilutionJustification || form.postServiceRecommendations) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...tc);
      doc.text("DESCRIÇÃO TÉCNICA DO PROCESSO", 15, y);
      y += 8;

      addField("Diagnóstico Inicial", form.diagnosis);
      addField("Procedimento Aplicado", form.procedure);
      addField("Justificativa da Diluição", form.dilutionJustification);
      addField("Recomendações Pós-serviço", form.postServiceRecommendations);
    }
  }

  if (form.serviceType) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(15, y - 2, 180, 12, 3, 3, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...tc);
    doc.text(`Recomendação: nova higienização em ${suggestion}`, 20, y + 6);
    y += 18;
  }

  y = renderPaymentFooter(doc, company, y);

  if (y < 240) y = 240;
  if (y > 260) { doc.addPage(); y = 240; }

  doc.setDrawColor(150, 150, 150);
  doc.line(30, y, 90, y);
  doc.line(120, y, 180, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);

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
  const tc: TC = hexToRgb(getCompanyTheme(company).primary);

  if (!isPro) {
    doc.setFontSize(50);
    doc.setTextColor(200, 220, 240);
    doc.text("HIG CLEAN TEC", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  let y = renderHeader(doc, company, isPro);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("RELATÓRIO DE EXECUÇÃO", 105, y, { align: "center" });
  y += 10;

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
    doc.setTextColor(...tc);
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

  addField("Processo Realizado", processDescription);

  if (productsUsed.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...tc);
    doc.text("Produtos Utilizados", 15, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Produto", "Diluição", "Solução (L)", "Concentrado (ml)"]],
      body: productsUsed.map(ep => [ep.productName, ep.dilution, String(ep.solutionVolumeLiters), String(ep.concentratedMl)]),
      theme: "striped",
      headStyles: { fillColor: tc, textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (nonConformities.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 50, 50);
    doc.text("REGISTRO DE NAO CONFORMIDADES", 15, y);
    y += 7;

    autoTable(doc, {
      startY: y,
      head: [["Ocorrência", "Grau", "Descrição", "Cliente Ciente"]],
      body: nonConformities.map(nc => [
        nc.type, nc.severity.toUpperCase(), nc.description || "-", nc.clientAware ? "Sim" : "Não",
      ]),
      theme: "striped",
      headStyles: { fillColor: [200, 50, 50], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  addField("Observações Finais", observations);

  // ---- FOTOS ANTES x DEPOIS lado a lado (economia de papel) ----
  const hasPhotos = photosBefore.length > 0 || photosAfter.length > 0;
  if (hasPhotos) {
    // Stay on same page if room, otherwise new page
    if (y + 75 > 280) { doc.addPage(); y = 20; }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...tc);
    doc.text("REGISTRO FOTOGRAFICO", 15, y);
    y += 5;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 160, 80);
    doc.text("Layout otimizado para reducao de impressao", 15, y + 3);
    y += 10;

    const maxPairs = Math.max(photosBefore.length, photosAfter.length);
    const colLeftX = 15;
    const colRightX = 108;
    const imgW = 82;
    const imgH = 55;

    for (let i = 0; i < maxPairs; i++) {
      // Check if we need a new page (photo block = badge 10 + image 55 + desc 8 ≈ 73)
      if (y + 75 > 280) { doc.addPage(); y = 20; }

      const photoBefore = photosBefore[i] || null;
      const photoAfter = photosAfter[i] || null;

      // Column headers for first pair or new page
      if (i === 0 || y === 20) {
        // ANTES header
        doc.setFillColor(255, 200, 50);
        doc.roundedRect(colLeftX, y, 30, 7, 2, 2, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("ANTES", colLeftX + 2, y + 5);

        // DEPOIS header
        doc.setFillColor(50, 200, 100);
        doc.roundedRect(colRightX, y, 30, 7, 2, 2, "F");
        doc.setTextColor(0, 0, 0);
        doc.text("DEPOIS", colRightX + 2, y + 5);
        y += 10;
      }

      // Render left (ANTES)
      const photoYStart = y;
      if (photoBefore) {
        try {
          doc.addImage(photoBefore.dataUrl, "JPEG", colLeftX, y, imgW, imgH);
          if (photoBefore.description) {
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            const descLines = doc.splitTextToSize(photoBefore.description, imgW);
            doc.text(descLines, colLeftX, y + imgH + 4);
          }
        } catch {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`[Foto ${i + 1} indisponível]`, colLeftX, y + 20);
        }
      }

      // Render right (DEPOIS)
      if (photoAfter) {
        try {
          doc.addImage(photoAfter.dataUrl, "JPEG", colRightX, photoYStart, imgW, imgH);
          if (photoAfter.description) {
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            const descLines = doc.splitTextToSize(photoAfter.description, imgW);
            doc.text(descLines, colRightX, photoYStart + imgH + 4);
          }
        } catch {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`[Foto ${i + 1} indisponível]`, colRightX, photoYStart + 20);
        }
      }

      y = photoYStart + imgH + 12;
    }
  }

  // Assinaturas - mesma página se houver espaço (~40px necessários)
  const sigHeight = 40;
  if (y + sigHeight > 280) { doc.addPage(); y = 20; }

  // Posiciona assinaturas no final da área disponível
  const sigY = Math.max(y + 15, 240);
  doc.setDrawColor(150, 150, 150);
  doc.line(30, sigY, 90, sigY);
  doc.line(120, sigY, 180, sigY);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(appointment.technicianName || companyName, 60, sigY + 5, { align: "center" });
  doc.text(appointment.clientName, 150, sigY + 5, { align: "center" });

  return doc;
}
