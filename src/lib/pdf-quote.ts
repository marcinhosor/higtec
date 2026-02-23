import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Quote, CompanyInfo } from "./storage";

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  parcelado: "Parcelado",
};

export function generateQuotePDF(quote: Quote, company: CompanyInfo) {
  const doc = new jsPDF();
  const isPro = company.isPro;
  const companyName = isPro ? company.name : "Hig Clean Tec";

  let y = 15;

  // Watermark for free version
  if (!isPro) {
    doc.setFontSize(50);
    doc.setTextColor(200, 220, 240);
    doc.text("HIG CLEAN TEC", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  // Logo
  if (isPro && company.logo) {
    try {
      doc.addImage(company.logo, "PNG", 15, y, 25, 25);
      y += 2;
    } catch { /* logo load failed */ }
  }

  // Company header
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
  if (isPro && company.instagram) { doc.text(`@${company.instagram}`, headerX, subY); subY += 5; }

  y = Math.max(subY, y + 30) + 5;

  // Divider
  doc.setDrawColor(41, 128, 205);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);
  y += 8;

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

  // Save
  doc.save(`orcamento-${quote.number}.pdf`);
}

export function generateProposalPDF(quote: Quote, company: CompanyInfo) {
  const doc = new jsPDF();
  const isPro = company.isPro;
  const companyName = isPro ? company.name : "Hig Clean Tec";

  let y = 15;

  if (!isPro) {
    doc.setFontSize(50);
    doc.setTextColor(200, 220, 240);
    doc.text("HIG CLEAN TEC", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  // Header
  if (isPro && company.logo) {
    try { doc.addImage(company.logo, "PNG", 15, y, 25, 25); } catch {}
  }
  const hx = isPro && company.logo ? 45 : 15;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 205);
  doc.text(companyName, hx, y + 6);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  let sy = y + 13;
  if (company.phone) { doc.text(`Tel: ${company.phone}`, hx, sy); sy += 5; }
  if (isPro && company.cnpj) { doc.text(`CNPJ: ${company.cnpj}`, hx, sy); sy += 5; }
  if (isPro && company.address) { doc.text(company.address, hx, sy); sy += 5; }
  y = Math.max(sy, y + 30) + 5;

  doc.setDrawColor(41, 128, 205);
  doc.line(15, y, 195, y);
  y += 10;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("PROPOSTA COMERCIAL", 105, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
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
    doc.setTextColor(60);
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
  doc.setTextColor(60);
  doc.text(`Forma de Pagamento: ${paymentLabels[quote.paymentMethod]}`, 15, y);
  y += 5;
  doc.text(`Validade da proposta: ${quote.validityDays} dias`, 15, y);
  y += 15;

  // Signature
  if (y < 250) y = 250;
  doc.setDrawColor(150);
  doc.line(30, y, 90, y);
  doc.line(120, y, 180, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(companyName, 60, y, { align: "center" });
  doc.text(quote.clientName, 150, y, { align: "center" });

  doc.save(`proposta-comercial-${quote.number}.pdf`);
}
