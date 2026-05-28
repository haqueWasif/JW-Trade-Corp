import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccountData } from "@/hooks/useAccountData";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/import")({ component: ImportPage });

// Map common header variants to our trade columns
const FIELD_MAP: Record<string, string> = {
  date: "date", time: "time", session: "session",
  pair: "instrument", instrument: "instrument", symbol: "instrument",
  direction: "direction", side: "direction", type: "direction",
  setup: "setup_type", "setup type": "setup_type",
  po3: "po3_phase", "po3 phase": "po3_phase", phase: "po3_phase",
  bias: "htf_bias", "htf bias": "htf_bias",
  entry: "entry_price", "entry price": "entry_price",
  sl: "stop_loss", "stop loss": "stop_loss", stoploss: "stop_loss",
  tp: "take_profit", "take profit": "take_profit", takeprofit: "take_profit",
  size: "position_size", lots: "position_size", "position size": "position_size",
  "risk %": "risk_pct", "risk pct": "risk_pct", risk: "risk_pct",
  "risk $": "risk_amount", "risk amount": "risk_amount",
  "reward $": "reward_amount", "reward amount": "reward_amount",
  rr: "planned_rr", "planned rr": "planned_rr",
  exit: "exit_price", "exit price": "exit_price",
  pnl: "pnl", "p/l": "pnl", profit: "pnl",
  r: "r_multiple", "r multiple": "r_multiple",
  outcome: "outcome", result: "outcome",
  grade: "grade", lesson: "lesson", mistakes: "mistakes",
  notes: "entry_reason", "entry reason": "entry_reason",
};

const NUM = new Set(["entry_price","stop_loss","take_profit","position_size","risk_pct","risk_amount","reward_amount","planned_rr","exit_price","pnl","r_multiple"]);

function normalizeDate(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  const d = new Date(String(v));
  if (isNaN(+d)) return null;
  return d.toISOString().slice(0, 10);
}

function ImportPage() {
  const { data: acc } = useAccountData();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    // pick the first sheet that looks like trades (has instrument-ish column)
    let rows: any[] = [];
    let sheetUsed = "";
    for (const name of wb.SheetNames) {
      const json = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });
      if (json.length && Object.keys(json[0] as any).some(k => /pair|instrument|symbol/i.test(k))) {
        rows = json; sheetUsed = name; break;
      }
    }
    if (!rows.length) {
      // fallback: first sheet
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
      sheetUsed = wb.SheetNames[0];
    }
    if (!rows.length) {
      toast.error("No rows detected in workbook");
      return;
    }
    setHeaders(Object.keys(rows[0]));
    setPreview(rows);
    toast.success(`Parsed ${rows.length} rows from "${sheetUsed}"`);
  }

  function mapRow(row: any): any | null {
    const out: any = {};
    for (const [k, v] of Object.entries(row)) {
      const key = FIELD_MAP[String(k).toLowerCase().trim()];
      if (!key) continue;
      out[key] = v;
    }
    if (!out.instrument) return null;
    out.date = normalizeDate(out.date) ?? new Date().toISOString().slice(0,10);
    if (out.direction) out.direction = /sell|short/i.test(String(out.direction)) ? "Sell" : "Buy";
    if (out.outcome) {
      const o = String(out.outcome).toLowerCase();
      out.outcome = o.includes("win") ? "Win" : o.includes("loss") ? "Loss" : "Breakeven";
    }
    for (const f of NUM) if (out[f] != null && out[f] !== "") out[f] = Number(out[f]);
    if (out.pnl == null) out.pnl = 0;
    return out;
  }

  async function importAll() {
    if (!acc?.account) return;
    setBusy(true);
    const mapped = preview.map(mapRow).filter(Boolean).map((r: any) => ({
      ...r,
      account_id: acc.account!.id,
      user_id: acc.account!.user_id,
    }));
    if (!mapped.length) {
      toast.error("No mappable rows found");
      setBusy(false); return;
    }
    // chunk inserts
    const chunkSize = 200;
    let inserted = 0;
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const { error } = await supabase.from("trades").insert(mapped.slice(i, i + chunkSize));
      if (error) { toast.error(error.message); setBusy(false); return; }
      inserted += Math.min(chunkSize, mapped.length - i);
    }
    setBusy(false);
    setPreview([]); setHeaders([]); setFileName("");
    qc.invalidateQueries({ queryKey: ["trades"] });
    toast.success(`Imported ${inserted} trades`);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl">
      <header>
        <div className="font-mono text-xs text-primary uppercase tracking-widest">// Migration</div>
        <h1 className="text-3xl font-bold mt-1">Import Spreadsheet</h1>
        <p className="text-sm text-muted-foreground mt-1">Bring your FundingPips workbook into the platform.</p>
      </header>

      <Card className="p-8 border-dashed border-2 text-center">
        <FileSpreadsheet className="size-12 text-primary mx-auto mb-3" />
        <div className="font-semibold mb-1">Upload .xlsx workbook</div>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Auto-detects the trade-log sheet. Maps common headers (Date, Pair, Direction, Entry, SL, TP, PnL, R, Grade, …).
        </p>
        <label>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          <Button asChild><span><Upload className="size-4 mr-2" /> Select workbook</span></Button>
        </label>
        {fileName && <div className="text-xs text-muted-foreground mt-3 font-mono">{fileName}</div>}
      </Card>

      {preview.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="font-semibold">Preview · {preview.length} rows</div>
              <div className="text-xs text-muted-foreground">First 10 shown · headers detected: {headers.length}</div>
            </div>
            <Button onClick={importAll} disabled={busy}>
              {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
              Import {preview.length} trades
            </Button>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 font-mono uppercase tracking-widest">
                <tr>{headers.map(h => <th key={h} className="text-left px-3 py-2 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {headers.map(h => <td key={h} className="px-3 py-1.5 whitespace-nowrap font-mono">{String(r[h] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="p-5 border-warning bg-warning-soft">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-warning mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold mb-1">Import tips</div>
            <p className="text-muted-foreground">
              Best results when your sheet has headers like: Date, Pair, Direction, Entry, SL, TP, Size, Risk %, RR, Exit, PnL, R, Outcome, Grade. Other columns are ignored.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
