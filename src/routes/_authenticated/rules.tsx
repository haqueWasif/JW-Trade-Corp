import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccountData } from "@/hooks/useAccountData";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Ban } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rules")({ component: RulesPage });

function RulesPage() {
  const { data } = useAccountData();
  const qc = useQueryClient();
  const [r, setR] = useState<any>(null);

  useEffect(() => { if (data?.rules) setR(data.rules); }, [data?.rules]);

  if (!r) return <div className="p-8 font-mono text-xs text-muted-foreground animate-pulse">Loading…</div>;

  async function save() {
    const { error } = await supabase.from("prop_firm_rules").update({
      phase1_target_pct: r.phase1_target_pct,
      phase2_target_pct: r.phase2_target_pct,
      daily_loss_pct: r.daily_loss_pct,
      max_loss_pct: r.max_loss_pct,
      min_trading_days: r.min_trading_days,
      inactivity_days: r.inactivity_days,
      notes: r.notes,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Rules updated");
    qc.invalidateQueries({ queryKey: ["account-data"] });
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl">
      <header>
        <div className="font-mono text-xs text-primary uppercase tracking-widest">// Compliance</div>
        <h1 className="text-3xl font-bold mt-1">Rules & Compliance</h1>
        <p className="text-sm text-muted-foreground mt-1">Editable firm rules. Adjust if FundingPips changes its terms.</p>
      </header>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2"><ShieldAlert className="size-4 text-primary" /><div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">// Firm Rules</div></div>
        <div className="grid md:grid-cols-3 gap-3">
          <Num l="Phase 1 target %" v={r.phase1_target_pct} on={(v)=>setR({...r, phase1_target_pct: v})} />
          <Num l="Phase 2 target %" v={r.phase2_target_pct} on={(v)=>setR({...r, phase2_target_pct: v})} />
          <Num l="Daily loss %" v={r.daily_loss_pct} on={(v)=>setR({...r, daily_loss_pct: v})} />
          <Num l="Max loss %" v={r.max_loss_pct} on={(v)=>setR({...r, max_loss_pct: v})} />
          <Num l="Min trading days" v={r.min_trading_days} on={(v)=>setR({...r, min_trading_days: v})} int />
          <Num l="Inactivity warning (days)" v={r.inactivity_days} on={(v)=>setR({...r, inactivity_days: v})} int />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Notes</Label>
          <Textarea rows={3} value={r.notes ?? ""} onChange={(e)=>setR({...r, notes: e.target.value})} />
        </div>
        <Button onClick={save}>Save rules</Button>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4"><Ban className="size-4 text-destructive" /><div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">// Prohibited Behavior</div></div>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          {[
            "No copy trading",
            "No account management by others",
            "No toxic flow",
            "No latency arbitrage",
            "No high-frequency manipulation",
            "No opposite hedging abuse",
            "No churning",
            "No gambling behavior",
            "No martingale",
            "No grid recovery",
            "No revenge trading",
          ].map((p) => (
            <div key={p} className="panel px-3 py-2 text-xs font-mono border-danger/40">⊘ {p}</div>
          ))}
        </div>
      </Card>
    </div>
  );
}
function Num({ l, v, on, int }: { l: string; v: number; on: (n: number) => void; int?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{l}</Label>
      <Input type="number" step={int ? "1" : "any"} value={v} onChange={(e)=>on(parseFloat(e.target.value) || 0)} />
    </div>
  );
}
