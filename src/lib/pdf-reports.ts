import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CompanyInfo, THEME_PALETTES, type ThemePalette } from "./storage";

type TC = [number, number, number];

function getCompanyTheme(company: CompanyInfo): ThemePalette {
  const canUse = company.isPro || company.planTier === 'pro' || company.planTier === 'premium';
  if (!canUse) return THEME_PALETTES[0];
  return THEME_PALETTES.find(t => t.id === company.selectedThemeId) || THEME_PALETTES[0];
}

function hexToRgb(hex: string): TC {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function renderReportHeader(doc: jsPDF, company: CompanyInfo, title: string, filterLabel: string): number {
  let y = 15;
  const theme = getCompanyTheme(company);
  const tc: TC = hexToRgb(theme.primary);
  const companyName = company.isPro ? company.name : "Hig Clean Tec";

  if (company.isPro && company.logo) {
    try {
      const logoW = 30, logoH = 30;
      doc.addImage(company.logo, "PNG", (210 - logoW) / 2, y, logoW, logoH);
      y += logoH + 3;
    } catch { /* skip */ }
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...tc);
  doc.text(companyName, 105, y, { align: "center" });
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const info: string[] = [];
  if (company.phone) info.push(`Tel: ${company.phone}`);
  if (company.isPro && company.cnpj) info.push(`CNPJ: ${company.cnpj}`);
  info.forEach(line => { doc.text(line, 105, y, { align: "center" }); y += 4; });

  y += 3;
  doc.setDrawColor(...tc);
  doc.setLineWidth(0.7);
  doc.line(15, y, 195, y);
  y += 8;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(title, 105, y, { align: "center" });
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(filterLabel, 105, y, { align: "center" });
  y += 10;

  return y;
}

export type MonthlySummary = {
  totalServices: number;
  totalRevenue: number;
  totalProductCost: number;
  ticketMedio: number;
  marginPercent: number;
  totalMinutes: number;
  approvedQuotes: number;
  topService: string;
};

export type ClientRow = {
  name: string;
  services: number;
  totalSpent: number;
  avgFrequencyDays: number | null;
};

export type ServiceRow = {
  name: string;
  count: number;
  totalRevenue: number;
  avgCost: number;
  avgMinutes: number;
  avgMargin: number;
};

export type ProductRow = {
  name: string;
  timesUsed: number;
  totalVolumeMl: number;
  totalCost: number;
  costPerService: number;
};

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function exportMonthlyPDF(company: CompanyInfo, data: MonthlySummary, filterLabel: string) {
  const doc = new jsPDF();
  const tc: TC = hexToRgb(getCompanyTheme(company).primary);
  let y = renderReportHeader(doc, company, "RELATÓRIO MENSAL", filterLabel);

  const rows = [
    ["Total de Serviços", String(data.totalServices)],
    ["Faturamento Bruto", `R$ ${data.totalRevenue.toFixed(2)}`],
    ["Custo de Produtos", `R$ ${data.totalProductCost.toFixed(2)}`],
    ["Lucro Estimado", `R$ ${(data.totalRevenue - data.totalProductCost).toFixed(2)}`],
    ["Margem Média", `${data.marginPercent.toFixed(1)}%`],
    ["Ticket Médio", `R$ ${data.ticketMedio.toFixed(2)}`],
    ["Tempo Total", formatMinutes(data.totalMinutes)],
    ["Orçamentos Aprovados", String(data.approvedQuotes)],
    ["Serviço Mais Vendido", data.topService],
  ];

  autoTable(doc, {
    startY: y,
    body: rows,
    theme: "striped",
    headStyles: { fillColor: tc },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
    margin: { left: 15, right: 15 },
  });

  doc.save("relatorio-mensal.pdf");
}

export function exportClientsPDF(company: CompanyInfo, data: ClientRow[], filterLabel: string) {
  const doc = new jsPDF();
  const tc: TC = hexToRgb(getCompanyTheme(company).primary);
  let y = renderReportHeader(doc, company, "RELATÓRIO POR CLIENTE", filterLabel);

  autoTable(doc, {
    startY: y,
    head: [["Cliente", "Serviços", "Faturado", "Frequência"]],
    body: data.map(c => [
      c.name,
      String(c.services),
      `R$ ${c.totalSpent.toFixed(2)}`,
      c.avgFrequencyDays != null ? `${c.avgFrequencyDays}d` : '-',
    ]),
    theme: "striped",
    headStyles: { fillColor: tc, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9 },
    margin: { left: 15, right: 15 },
  });

  doc.save("relatorio-clientes.pdf");
}

export function exportServicesPDF(company: CompanyInfo, data: ServiceRow[], filterLabel: string) {
  const doc = new jsPDF();
  const tc: TC = hexToRgb(getCompanyTheme(company).primary);
  let y = renderReportHeader(doc, company, "RELATÓRIO POR SERVIÇO", filterLabel);

  autoTable(doc, {
    startY: y,
    head: [["Serviço", "Qtd", "Receita", "Custo Médio", "Tempo Médio", "Margem"]],
    body: data.map(s => [
      s.name,
      String(s.count),
      `R$ ${s.totalRevenue.toFixed(2)}`,
      `R$ ${s.avgCost.toFixed(2)}`,
      formatMinutes(s.avgMinutes),
      `${s.avgMargin.toFixed(1)}%`,
    ]),
    theme: "striped",
    headStyles: { fillColor: tc, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9 },
    margin: { left: 15, right: 15 },
  });

  doc.save("relatorio-servicos.pdf");
}

export function exportProductsPDF(company: CompanyInfo, data: ProductRow[], filterLabel: string) {
  const doc = new jsPDF();
  const tc: TC = hexToRgb(getCompanyTheme(company).primary);
  let y = renderReportHeader(doc, company, "RELATÓRIO POR PRODUTO", filterLabel);

  autoTable(doc, {
    startY: y,
    head: [["Produto", "Usos", "Volume Total", "Custo Total", "Custo/Serviço"]],
    body: data.map(p => [
      p.name,
      String(p.timesUsed),
      `${(p.totalVolumeMl / 1000).toFixed(2)}L`,
      `R$ ${p.totalCost.toFixed(2)}`,
      `R$ ${p.costPerService.toFixed(2)}`,
    ]),
    theme: "striped",
    headStyles: { fillColor: tc, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9 },
    margin: { left: 15, right: 15 },
  });

  doc.save("relatorio-produtos.pdf");
}
