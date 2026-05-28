import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAccountData, useTrades } from "@/hooks/useAccountData";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Filter, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { fmtMoney } from "@/lib/trading";

export const Route = createFileRoute("/_authenticated/journal")({ component: JournalPage });

const blank = () => ({
  date: new Date().toISOString().slice(0, 10),
  time: new Date().toTimeString().slice(0, 5),
  session: "NY AM",
  instrument: "EURUSD",
  direction: "Buy",
  setup_type: "PO3",
  po3_phase: "Distribution",
  htf_bias: "",
  entry_reason: "",
  entry_price: "" as any, stop_loss: "" as any, take_profit: "" as any,
  position_size: "" as any, risk_pct: "" as any, risk_amount: "" as any,
  reward_amount: "" as any, planned_rr: "" as any, exit_price: "" as any,
  pnl: 0, r_multiple: "" as any, outcome: "Win",
  emotion_before: "Calm", emotion_during: "Calm", emotion_after: "Calm",
  mistakes: "", rule_broken: false, which_rule: "", lesson: "",
  grade: "B", followed_plan: true,
});

function JournalPage() {
  const { data: acc } = useAccountData();
  const { data: trades = [] } = useTrades(acc?.account?.id);
  const qc = useQueryClient();
  const [editTrade, setEditTrade] = useState<any>(null);

  const [filters, setFilters] = useState({ pair: "all", session: "all", outcome: "all", rule: "all" });
  const filtered = useMemo(() => trades.filter((t) =>
    (filters.pair === "all" || t.instrument === filters.pair) &&
    (filters.session === "all" || t.session === filters.session) &&
    (filters.outcome === "all" || t.outcome === filters.outcome) &&
    (filters.rule === "all" || (filters.rule === "broken" ? t.rule_broken : !t.rule_broken))
  ), [trades, filters]);

  const pairs = Array.from(new Set(trades.map((t) => t.instrument))).filter(Boolean);

  // analytics
  const wins = trades.filter((t) => t.outcome === "Win").length;
  const losses = trades.filter((t) => t.outcome === "Loss").length;
  const be = trades.filter((t) => t.outcome === "Breakeven").length;
  const totalR = trades.reduce((s, t) => s + (Number(t.r_multiple) || 0), 0);
  const totalPnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const avgWin = wins ? trades.filter((t) => t.outcome === "Win").reduce((s, t) => s + (Number(t.pnl) || 0), 0) / wins : 0;
  const avgLoss = losses ? trades.filter((t) => t.outcome === "Loss").reduce((s, t) => s + (Number(t.pnl) || 0), 0) / losses : 0;
  const profitFactor = losses && avgLoss ? Math.abs((avgWin * wins) / (avgLoss * losses)) : 0;
  const ruleBreaks = trades.filter((t) => t.rule_broken).length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px]">
      <header className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <div className="font-mono text-xs text-primary uppercase tracking-widest">// Trade Log</div>
          <h1 className="text-3xl font-bold mt-1">Trading Journal</h1>
          <p className="text-sm text-muted-foreground mt-1">Every trade. Every emotion. Every lesson.</p>
        </div>
        <NewTradeDialog accountId={acc?.account?.id} onSaved={() => qc.invalidateQueries({ queryKey: ["trades"] })} />
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Stat label="Trades" value={String(trades.length)} />
        <Stat label="Win rate" value={`${winRate.toFixed(1)}%`} />
        <Stat label="Total R" value={totalR.toFixed(2)} accent={totalR >= 0 ? "success" : "danger"} />
        <Stat label="Net P/L" value={fmtMoney(totalPnl)} accent={totalPnl >= 0 ? "success" : "danger"} />
        <Stat label="Profit factor" value={profitFactor ? profitFactor.toFixed(2) : "—"} />
        <Stat label="Rule breaks" value={String(ruleBreaks)} accent={ruleBreaks ? "danger" : undefined} />
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <Filter className="size-4 text-muted-foreground" />
        <FilterSelect val={filters.pair} onChange={(v: string)=>setFilters({...filters, pair: v})} label="Pair" options={["all", ...pairs]} />
        <FilterSelect val={filters.session} onChange={(v: string)=>setFilters({...filters, session: v})} label="Session" options={["all","NY AM","NY PM","London","Asia"]} />
        <FilterSelect val={filters.outcome} onChange={(v: string)=>setFilters({...filters, outcome: v})} label="Outcome" options={["all","Win","Loss","Breakeven"]} />
        <FilterSelect val={filters.rule} onChange={(v: string)=>setFilters({...filters, rule: v})} label="Rule" options={["all","broken","clean"]} />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
              <tr>
                {["Date","Session","Pair","Dir","Setup","Phase","Entry","SL","TP","R","P/L","Grade","Rule","Plan"].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={14} className="text-center py-12 text-muted-foreground text-sm">
                  No trades logged yet. Click <span className="text-primary font-medium">New Trade</span> to begin.
                </td></tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-accent/30 cursor-pointer" onClick={() => setEditTrade(t)}>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{t.date}</td>
                  <td className="px-3 py-2 text-xs">{t.session}</td>
                  <td className="px-3 py-2 font-medium">{t.instrument}</td>
                  <td className="px-3 py-2">
                    {t.direction === "Buy" ? <TrendingUp className="size-3.5 text-success inline" /> : <TrendingDown className="size-3.5 text-destructive inline" />}
                    <span className="ml-1 text-xs">{t.direction}</span>
                  </td>
                  <td className="px-3 py-2 text-xs">{t.setup_type}</td>
                  <td className="px-3 py-2 text-xs">{t.po3_phase ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.entry_price ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.stop_loss ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.take_profit ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.r_multiple != null ? Number(t.r_multiple).toFixed(2) : "—"}</td>
                  <td className={`px-3 py-2 font-mono font-semibold ${Number(t.pnl) >= 0 ? "text-success" : "text-destructive"}`}>{fmtMoney(Number(t.pnl) || 0)}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="font-mono">{t.grade ?? "—"}</Badge></td>
                  <td className="px-3 py-2">{t.rule_broken ? <Badge variant="destructive" className="text-[10px]">BROKEN</Badge> : <Badge variant="outline" className="text-[10px] border-success text-success">CLEAN</Badge>}</td>
                  <td className="px-3 py-2">{t.followed_plan ? "✓" : <Minus className="size-3 inline" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editTrade && (
        <TradeDialog
          accountId={acc?.account?.id}
          trade={editTrade}
          open={!!editTrade}
          onOpenChange={(o) => !o && setEditTrade(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["trades"] }); qc.invalidateQueries({ queryKey: ["account"] }); setEditTrade(null); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "success" | "danger" }) {
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</div>
      <div className={`text-lg font-bold mt-1 ${accent === "success" ? "text-success" : accent === "danger" ? "text-destructive" : ""}`}>{value}</div>
    </Card>
  );
}
function FilterSelect({ val, onChange, label, options }: any) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</Label>
      <Select value={val} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function NewTradeDialog({ accountId, onSaved }: { accountId?: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="size-4 mr-1.5" /> New Trade</Button>
      {open && (
        <TradeDialog
          accountId={accountId}
          open={open}
          onOpenChange={setOpen}
          onSaved={() => { setOpen(false); onSaved(); }}
        />
      )}
    </>
  );
}

function TradeDialog({ accountId, trade, open, onOpenChange, onSaved }: {
  accountId?: string;
  trade?: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { data: acc } = useAccountData();
  const isEdit = !!trade?.id;
  const [t, setT] = useState<any>(() => trade ? { ...blank(), ...trade } : blank());
  const [shotBefore, setShotBefore] = useState<File | null>(null);
  const [shotAfter, setShotAfter] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const settings = acc?.settings;
  const account = acc?.account;
  const rules = acc?.rules;

  const warnings: string[] = [];
  if (settings && Number(t.risk_pct) > Number(settings.risk_per_trade_pct)) warnings.push(`Risk ${t.risk_pct}% exceeds your personal limit of ${settings.risk_per_trade_pct}%`);
  if (settings && Number(t.planned_rr) > 0 && Number(t.planned_rr) < Number(settings.min_rr)) warnings.push(`Planned RR ${t.planned_rr} below minimum ${settings.min_rr}R`);
  if (account && rules && Number(t.risk_amount) > account.starting_balance * (rules.daily_loss_pct / 100)) warnings.push("Risk amount exceeds daily loss limit");

  function setF(k: string, v: any) { setT({ ...t, [k]: v }); }

  async function uploadShot(file: File, userId: string, label: string): Promise<string | null> {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${userId}/${Date.now()}-${label}.${ext}`;
    const { error } = await supabase.storage.from("trade-screenshots").upload(path, file, { upsert: false });
    if (error) { toast.error(`${label} upload failed: ${error.message}`); return null; }
    return path;
  }

  async function save() {
    if (!accountId || !account) return;
    setUploading(true);
    const numFields = ["entry_price","stop_loss","take_profit","position_size","risk_pct","risk_amount","reward_amount","planned_rr","exit_price","pnl","r_multiple"];
    const payload: any = { ...t };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    numFields.forEach((k) => { payload[k] = payload[k] === "" || payload[k] == null ? null : Number(payload[k]); });
    payload.pnl = payload.pnl ?? 0;

    if (shotBefore) payload.screenshot_before = await uploadShot(shotBefore, account.user_id, "before");
    if (shotAfter) payload.screenshot_after = await uploadShot(shotAfter, account.user_id, "after");

    if (isEdit) {
      const oldPnl = Number(trade.pnl) || 0;
      const { error } = await supabase.from("trades").update(payload).eq("id", trade.id);
      if (error) { setUploading(false); return toast.error(error.message); }
      const delta = payload.pnl - oldPnl;
      if (delta !== 0) {
        await supabase.from("trading_accounts").update({
          current_balance: account.current_balance + delta,
          current_equity: account.current_equity + delta,
        }).eq("id", account.id);
      }
      toast.success("Trade updated");
    } else {
      payload.account_id = accountId;
      payload.user_id = account.user_id;
      const { error } = await supabase.from("trades").insert(payload);
      if (error) { setUploading(false); return toast.error(error.message); }
      if (payload.pnl) {
        await supabase.from("trading_accounts").update({
          current_balance: account.current_balance + payload.pnl,
          current_equity: account.current_equity + payload.pnl,
        }).eq("id", account.id);
      }
      toast.success("Trade logged");
    }
    setUploading(false);
    onSaved();
  }

  async function remove() {
    if (!isEdit || !account) return;
    if (!confirm("Delete this trade? This cannot be undone.")) return;
    setDeleting(true);
    const oldPnl = Number(trade.pnl) || 0;
    const { error } = await supabase.from("trades").delete().eq("id", trade.id);
    if (error) { setDeleting(false); return toast.error(error.message); }
    if (oldPnl !== 0) {
      await supabase.from("trading_accounts").update({
        current_balance: account.current_balance - oldPnl,
        current_equity: account.current_equity - oldPnl,
      }).eq("id", account.id);
    }
    setDeleting(false);
    toast.success("Trade deleted");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Trade" : "Log Trade"}</DialogTitle></DialogHeader>

        {warnings.length > 0 && (
          <div className="border border-danger bg-danger-soft rounded p-3 text-sm">
            <div className="flex items-center gap-2 text-destructive font-semibold mb-1"><AlertTriangle className="size-4" /> Rule-breach prevention</div>
            <ul className="text-xs space-y-0.5">{warnings.map(w=><li key={w}>• {w}</li>)}</ul>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-3">
          <F l="Date"><Input type="date" value={t.date} onChange={(e)=>setF("date", e.target.value)} /></F>
          <F l="Time"><Input type="time" value={t.time ?? ""} onChange={(e)=>setF("time", e.target.value)} /></F>
          <F l="Session"><Sel v={t.session} on={(v: string)=>setF("session", v)} opts={["NY AM","NY PM","London","Asia"]} /></F>
          <F l="Instrument"><Input value={t.instrument} onChange={(e)=>setF("instrument", e.target.value)} /></F>
          <F l="Direction"><Sel v={t.direction} on={(v: string)=>setF("direction", v)} opts={["Buy","Sell"]} /></F>
          <F l="Setup / strategy"><Sel v={t.setup_type} on={(v: string)=>setF("setup_type", v)} opts={["PO3","BOS / CHoCH","Range Reversion","EMA Pullback","Breakout","Mean Reversion","Other"]} /></F>
          {t.setup_type === "PO3" && (
            <F l="PO3 phase"><Sel v={t.po3_phase} on={(v: string)=>setF("po3_phase", v)} opts={["Accumulation","Manipulation","Distribution"]} /></F>
          )}
          <F l="HTF bias"><Input value={t.htf_bias ?? ""} onChange={(e)=>setF("htf_bias", e.target.value)} /></F>
          <F l="Outcome"><Sel v={t.outcome} on={(v: string)=>setF("outcome", v)} opts={["Win","Loss","Breakeven"]} /></F>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <F l="Entry"><Input type="number" step="any" value={t.entry_price ?? ""} onChange={(e)=>setF("entry_price", e.target.value)} /></F>
          <F l="Stop loss"><Input type="number" step="any" value={t.stop_loss ?? ""} onChange={(e)=>setF("stop_loss", e.target.value)} /></F>
          <F l="Take profit"><Input type="number" step="any" value={t.take_profit ?? ""} onChange={(e)=>setF("take_profit", e.target.value)} /></F>
          <F l="Position size"><Input type="number" step="any" value={t.position_size ?? ""} onChange={(e)=>setF("position_size", e.target.value)} /></F>
          <F l="Risk %"><Input type="number" step="any" value={t.risk_pct ?? ""} onChange={(e)=>setF("risk_pct", e.target.value)} /></F>
          <F l="Risk $"><Input type="number" step="any" value={t.risk_amount ?? ""} onChange={(e)=>setF("risk_amount", e.target.value)} /></F>
          <F l="Reward $"><Input type="number" step="any" value={t.reward_amount ?? ""} onChange={(e)=>setF("reward_amount", e.target.value)} /></F>
          <F l="Planned RR"><Input type="number" step="any" value={t.planned_rr ?? ""} onChange={(e)=>setF("planned_rr", e.target.value)} /></F>
          <F l="Exit price"><Input type="number" step="any" value={t.exit_price ?? ""} onChange={(e)=>setF("exit_price", e.target.value)} /></F>
          <F l="P/L $"><Input type="number" step="any" value={t.pnl ?? 0} onChange={(e)=>setF("pnl", e.target.value)} /></F>
          <F l="R multiple"><Input type="number" step="any" value={t.r_multiple ?? ""} onChange={(e)=>setF("r_multiple", e.target.value)} /></F>
          <F l="Grade"><Sel v={t.grade} on={(v: string)=>setF("grade", v)} opts={["A+","A","B","C","D","F"]} /></F>
        </div>

        <F l="Entry reason"><Textarea rows={2} value={t.entry_reason ?? ""} onChange={(e)=>setF("entry_reason", e.target.value)} /></F>

        <div className="grid md:grid-cols-3 gap-3">
          <F l="Emotion before"><Sel v={t.emotion_before} on={(v: string)=>setF("emotion_before", v)} opts={["Calm","Fearful","Greedy","Revenge","Tired","Confident"]} /></F>
          <F l="Emotion during"><Sel v={t.emotion_during} on={(v: string)=>setF("emotion_during", v)} opts={["Calm","Fearful","Greedy","Revenge","Tired","Confident"]} /></F>
          <F l="Emotion after"><Sel v={t.emotion_after} on={(v: string)=>setF("emotion_after", v)} opts={["Calm","Satisfied","Frustrated","Euphoric","Defeated"]} /></F>
        </div>

        <F l="Mistakes"><Textarea rows={2} value={t.mistakes ?? ""} onChange={(e)=>setF("mistakes", e.target.value)} /></F>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!t.rule_broken} onCheckedChange={(v)=>setF("rule_broken", !!v)} /> Rule broken</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!t.followed_plan} onCheckedChange={(v)=>setF("followed_plan", !!v)} /> Followed plan</label>
        </div>
        {t.rule_broken && <F l="Which rule"><Input value={t.which_rule ?? ""} onChange={(e)=>setF("which_rule", e.target.value)} /></F>}
        <F l="Lesson learned"><Textarea rows={2} value={t.lesson ?? ""} onChange={(e)=>setF("lesson", e.target.value)} /></F>

        <div className="grid md:grid-cols-2 gap-3">
          <F l={`Screenshot (before)${t.screenshot_before ? " — replace" : ""}`}>
            {t.screenshot_before && <div className="text-[10px] font-mono text-muted-foreground mb-1 truncate">current: {t.screenshot_before}</div>}
            <Input type="file" accept="image/*" onChange={(e)=>setShotBefore(e.target.files?.[0] ?? null)} />
          </F>
          <F l={`Screenshot (after)${t.screenshot_after ? " — replace" : ""}`}>
            {t.screenshot_after && <div className="text-[10px] font-mono text-muted-foreground mb-1 truncate">current: {t.screenshot_after}</div>}
            <Input type="file" accept="image/*" onChange={(e)=>setShotAfter(e.target.files?.[0] ?? null)} />
          </F>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {isEdit && (
            <Button variant="destructive" onClick={remove} disabled={uploading || deleting} className="mr-auto">
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
          <Button variant="outline" onClick={()=>onOpenChange(false)} disabled={uploading || deleting}>Cancel</Button>
          <Button onClick={save} disabled={uploading || deleting}>{uploading ? "Saving…" : isEdit ? "Save changes" : "Log Trade"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ l, children }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{l}</Label>
      {children}
    </div>
  );
}
function Sel({ v, on, opts }: any) {
  return (
    <Select value={v} onValueChange={on}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{opts.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}
