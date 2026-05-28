import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccountData } from "@/hooks/useAccountData";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { data } = useAccountData();
  const qc = useQueryClient();
  const [acc, setAcc] = useState<any>(null);
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    if (data?.account) setAcc(data.account);
    if (data?.settings) setS(data.settings);
  }, [data]);

  if (!acc || !s) return <div className="p-8 font-mono text-xs text-muted-foreground animate-pulse">Loading…</div>;

  async function saveAccount() {
    const { error } = await supabase.from("trading_accounts").update({
      name: acc.name, prop_firm: acc.prop_firm, challenge_type: acc.challenge_type, phase: acc.phase,
      account_size: acc.account_size, starting_balance: acc.starting_balance,
      current_balance: acc.current_balance, current_equity: acc.current_equity,
    }).eq("id", acc.id);
    if (error) return toast.error(error.message);
    toast.success("Account updated");
    qc.invalidateQueries({ queryKey: ["account-data"] });
  }
  async function saveSettings() {
    const { error } = await supabase.from("user_settings").update({
      risk_per_trade_pct: s.risk_per_trade_pct,
      personal_daily_stop_pct: s.personal_daily_stop_pct,
      max_trades_per_day: s.max_trades_per_day,
      stop_after_losses: s.stop_after_losses,
      min_rr: s.min_rr,
      preferred_session: s.preferred_session,
      timezone: s.timezone,
      default_pairs: typeof s.default_pairs === "string"
        ? s.default_pairs.split(",").map((x: string) => x.trim()).filter(Boolean)
        : s.default_pairs,
    }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Personal settings updated");
    qc.invalidateQueries({ queryKey: ["account-data"] });
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl">
      <header>
        <div className="font-mono text-xs text-primary uppercase tracking-widest">// Configuration</div>
        <h1 className="text-3xl font-bold mt-1">Settings</h1>
      </header>

      <Card className="p-6 space-y-4">
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">// Account</div>
        <div className="grid md:grid-cols-2 gap-3">
          <F l="Name"><Input value={acc.name} onChange={(e)=>setAcc({...acc, name: e.target.value})} /></F>
          <F l="Prop firm"><Input value={acc.prop_firm} onChange={(e)=>setAcc({...acc, prop_firm: e.target.value})} /></F>
          <F l="Challenge type"><Input value={acc.challenge_type} onChange={(e)=>setAcc({...acc, challenge_type: e.target.value})} /></F>
          <F l="Phase">
            <Select value={acc.phase} onValueChange={(v)=>setAcc({...acc, phase: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Phase 1","Phase 2","Funded"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F l="Account size"><Input type="number" step="any" value={acc.account_size} onChange={(e)=>setAcc({...acc, account_size: parseFloat(e.target.value)||0})} /></F>
          <F l="Starting balance"><Input type="number" step="any" value={acc.starting_balance} onChange={(e)=>setAcc({...acc, starting_balance: parseFloat(e.target.value)||0})} /></F>
          <F l="Current balance"><Input type="number" step="any" value={acc.current_balance} onChange={(e)=>setAcc({...acc, current_balance: parseFloat(e.target.value)||0})} /></F>
          <F l="Current equity"><Input type="number" step="any" value={acc.current_equity} onChange={(e)=>setAcc({...acc, current_equity: parseFloat(e.target.value)||0})} /></F>
        </div>
        <Button onClick={saveAccount}>Save account</Button>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">// Personal Rules</div>
        <div className="grid md:grid-cols-2 gap-3">
          <F l="Risk per trade %"><Input type="number" step="any" value={s.risk_per_trade_pct} onChange={(e)=>setS({...s, risk_per_trade_pct: parseFloat(e.target.value)||0})} /></F>
          <F l="Personal daily stop %"><Input type="number" step="any" value={s.personal_daily_stop_pct} onChange={(e)=>setS({...s, personal_daily_stop_pct: parseFloat(e.target.value)||0})} /></F>
          <F l="Max trades per day"><Input type="number" value={s.max_trades_per_day} onChange={(e)=>setS({...s, max_trades_per_day: parseInt(e.target.value)||0})} /></F>
          <F l="Stop after X losses"><Input type="number" value={s.stop_after_losses} onChange={(e)=>setS({...s, stop_after_losses: parseInt(e.target.value)||0})} /></F>
          <F l="Minimum RR"><Input type="number" step="any" value={s.min_rr} onChange={(e)=>setS({...s, min_rr: parseFloat(e.target.value)||0})} /></F>
          <F l="Preferred session">
            <Select value={s.preferred_session} onValueChange={(v)=>setS({...s, preferred_session: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["NY AM","NY PM","London","Asia"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F l="Timezone"><Input value={s.timezone} onChange={(e)=>setS({...s, timezone: e.target.value})} /></F>
          <F l="Default pairs (comma)">
            <Input value={Array.isArray(s.default_pairs) ? s.default_pairs.join(", ") : s.default_pairs}
              onChange={(e)=>setS({...s, default_pairs: e.target.value})} />
          </F>
        </div>
        <Button onClick={saveSettings}>Save personal settings</Button>
      </Card>
    </div>
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
