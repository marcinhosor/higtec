import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type ImportTarget = "clients" | "products" | "collaborators" | "appointments";

interface CsvImporterProps {
  companyId: string;
}

const TARGET_CONFIG: Record<ImportTarget, { label: string; columns: string[]; required: string[]; example: string[][] }> = {
  clients: {
    label: "Clientes",
    columns: ["name", "phone", "street", "number", "complement", "neighborhood", "city", "state", "property_type", "observations"],
    required: ["name"],
    example: [
      ["name", "phone", "street", "number", "city", "state", "property_type"],
      ["João Silva", "(11) 99999-0000", "Rua das Flores", "123", "São Paulo", "SP", "Apartamento"],
      ["Maria Souza", "(21) 88888-0000", "Av. Brasil", "456", "Rio de Janeiro", "RJ", "Casa"],
    ],
  },
  products: {
    label: "Produtos",
    columns: ["name", "manufacturer", "type", "dilution", "ph", "cost_per_liter", "current_stock_ml", "min_stock_ml"],
    required: ["name"],
    example: [
      ["name", "manufacturer", "type", "dilution", "ph", "cost_per_liter"],
      ["Detergente Neutro", "Spartan", "Detergente", "1:10", "7", "45.00"],
      ["Tira Manchas", "W&W", "Removedor", "Puro", "12", "89.90"],
    ],
  },
  collaborators: {
    label: "Colaboradores",
    columns: ["name", "role", "phone"],
    required: ["name"],
    example: [
      ["name", "role", "phone"],
      ["Carlos Técnico", "Técnico", "(11) 97777-0000"],
      ["Ana Auxiliar", "Auxiliar", "(11) 96666-0000"],
    ],
  },
  appointments: {
    label: "Agendamentos",
    columns: ["client_name", "date", "time", "service", "notes", "status"],
    required: ["client_name", "date", "time"],
    example: [
      ["client_name", "date", "time", "service", "notes"],
      ["João Silva", "2025-03-15", "09:00", "Limpeza de Sofá", "Cliente pediu urgência"],
      ["Maria Souza", "2025-03-16", "14:00", "Higienização de Colchão", ""],
    ],
  },
};

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function downloadTemplate(target: ImportTarget) {
  const config = TARGET_CONFIG[target];
  const csv = config.example.map(row => row.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `modelo_${target}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CsvImporter({ companyId }: CsvImporterProps) {
  const [target, setTarget] = useState<ImportTarget>("clients");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; errors: number; errorDetails: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Selecione um arquivo .csv");
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      toast.error("O arquivo deve ter pelo menos um cabeçalho e uma linha de dados");
      setImporting(false);
      return;
    }

    const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const dataRows = rows.slice(1);
    const config = TARGET_CONFIG[target];

    // Validate required columns
    const missingRequired = config.required.filter(r => !headers.includes(r));
    if (missingRequired.length > 0) {
      toast.error(`Colunas obrigatórias faltando: ${missingRequired.join(", ")}`);
      setImporting(false);
      return;
    }

    let success = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    const batchSize = 50;

    for (let i = 0; i < dataRows.length; i += batchSize) {
      const batch = dataRows.slice(i, i + batchSize);
      const records = batch.map((row, rowIdx) => {
        const record: Record<string, any> = { company_id: companyId };
        headers.forEach((h, colIdx) => {
          if (config.columns.includes(h) && row[colIdx]) {
            const val = row[colIdx];
            if (["ph", "cost_per_liter", "current_stock_ml", "min_stock_ml"].includes(h)) {
              record[h] = parseFloat(val.replace(",", ".")) || null;
            } else {
              record[h] = val;
            }
          }
        });
        // Build address for clients
        if (target === "clients") {
          const parts = [record.street, record.number, record.complement, record.neighborhood, record.city, record.state].filter(Boolean);
          record.address = parts.join(", ") || null;
        }
        // Default client_id for appointments
        if (target === "appointments" && !record.client_id) {
          record.client_id = "imported";
        }
        return record;
      }).filter(r => {
        const valid = config.required.every(req => r[req]);
        if (!valid) {
          errors++;
          errorDetails.push(`Linha ${i + batch.indexOf(r as any) + 2}: campo obrigatório vazio`);
        }
        return valid;
      });

      if (records.length > 0) {
        const tableName = target === "appointments" ? "appointments" : target;
        const { error } = await supabase.from(tableName).insert(records as any);
        if (error) {
          errors += records.length;
          errorDetails.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          success += records.length;
        }
      }

      setProgress(Math.round(((i + batch.length) / dataRows.length) * 100));
    }

    setResult({ success, errors, errorDetails });
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
    if (success > 0) toast.success(`${success} registro(s) importado(s) com sucesso!`);
    if (errors > 0) toast.error(`${errors} registro(s) com erro`);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>O que deseja importar?</Label>
        <Select value={target} onValueChange={v => { setTarget(v as ImportTarget); setResult(null); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(TARGET_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-dashed border-primary/30 p-4 text-center space-y-3">
        <FileSpreadsheet className="h-8 w-8 text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">
          Colunas aceitas: <span className="font-mono text-xs">{TARGET_CONFIG[target].columns.join(", ")}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Obrigatórias: <span className="font-semibold">{TARGET_CONFIG[target].required.join(", ")}</span> • Separador: vírgula ou ponto-e-vírgula
        </p>

        <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadTemplate(target)}>
          <Download className="h-3 w-3" /> Baixar modelo CSV
        </Button>
      </div>

      <div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="w-full rounded-full gap-2"
        >
          <Upload className="h-4 w-4" />
          {importing ? "Importando..." : "Selecionar arquivo CSV"}
        </Button>
      </div>

      {importing && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{progress}% concluído</p>
        </div>
      )}

      {result && (
        <div className="rounded-lg border p-3 space-y-2">
          {result.success > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{result.success} registro(s) importado(s)</span>
            </div>
          )}
          {result.errors > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>{result.errors} erro(s)</span>
              </div>
              {result.errorDetails.slice(0, 5).map((detail, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-6">{detail}</p>
              ))}
              {result.errorDetails.length > 5 && (
                <p className="text-xs text-muted-foreground pl-6">...e mais {result.errorDetails.length - 5} erros</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
