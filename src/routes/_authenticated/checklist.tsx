import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccountData } from "@/hooks/useAccountData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { ShieldCheck, ShieldX, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/checklist")({ component: ChecklistPage });

type Check = {
  id?: string;
  date: string;
  session: string;
  instrument: string;
  strategy_model: string;
  htf_bias: string;
  daily_bias: string;
  news_checked: boolean;
  red_news_avoided: boolean;
  liquidity_marked: boolean;
  asia_range_marked: boolean;
  london_manipulation_checked: boolean;
  po3_model_present: boolean;
  accumulation_identified: boolean;
  manipulation_identified: boolean;
  distribution_confirmed: boolean;
  entry_model_valid: boolean;
  risk_calculated: boolean;
  max_trades_not_exceeded: boolean;
  emotional_state: string;
  sleep_quality: string;
  confidence_level: number;
  plan_notes: string;
  trade_allowed: boolean;
};

const STRATEGY_MODELS = [
  "PO3 (Power of Three)",
  "Silver Bullet",
  "OB / FVG Entry",
  "Liquidity Sweep + MSS",
  "Judas Swing",
  "SMC (Smart Money Concepts)",
  "Supply & Demand",
  "Breakout",
  "Mean Reversion",
  "Trend Continuation",
  "Other",
];

const today = () => new Date().toISOString().slice(0, 10);

const blank = (): Check => ({
  date: today(), session: "NY AM", instrument: "EURUSD",
  strategy_model: "PO3 (Power of Three)",
  htf_bias: "", daily_bias: "Neutral",
  news_checked: false, red_news_avoided: false, liquidity_marked: false,
  asia_range_marked: false, london_manipulation_checked: false, po3_model_present: false,
  accumulation_identified: false, manipulation_identified: false, distribution_confirmed: false,
  entry_model_valid: false, risk_calculated: false, max_trades_not_exceeded: true,
  emotional_state: "Calm", sleep_quality: "Good", confidence_level: 7,
  plan_notes: "", trade_allowed: false,
});

function ChecklistPage() {
  const { data: acc } = useAccountData();
  const qc = useQueryClient();
  const [c, setC] = useState<Check>(blank());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: settings }, { data: existing }] = await Promise.all([
        supabase.from("user_settings").select("preferred_session, default_pairs").maybeSingle(),
        supabase.from("daily_checklists").select("*").eq("date", today()).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (existing) {
        setC({ ...blank(), ...(existing as any) });
      } else if (settings) {
        const pairs = (settings as any).default_pairs;
        setC({
          ...blank(),
          session: (settings as any).preferred_session || "NY AM",
          instrument: Array.isArray(pairs) && pairs.length ? pairs[0] : "EURUSD",
        });
      }
      setLoading(false);
    })();
  }, []);

  function set<K extends keyof Check>(k: K, v: Check[K]) { setC({ ...c, [k]: v }); }

  // Block engine
  const blockers: string[] = [];
  if (!c.news_checked) blockers.push("News not checked");
  if (!c.po3_model_present) blockers.push("Strategy model not confirmed");
  if (!c.risk_calculated) blockers.push("Risk not calculated");
  if (!c.max_trades_not_exceeded) blockers.push("Max trades reached");
  if (c.emotional_state === "Revenge mode") blockers.push("Emotional state: Revenge mode");
  if (c.emotional_state === "Tired") blockers.push("Emotional state: Tired");
  const allowed = blockers.length === 0;

  async function save(asAllowed: boolean) {
    if (!acc?.account) return;
    const payload = { ...c, trade_allowed: asAllowed, account_id: acc.account.id };
    if (c.id) {
      const { error } = await supabase.from("daily_checklists").update(payload).eq("id", c.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("daily_checklists").insert({ ...payload, user_id: acc.account.user_id }).select().single();
      if (error) return toast.error(error.message);
      setC({ ...c, id: data.id });
    }
    qc.invalidateQueries({ queryKey: ["account-data"] });
    toast.success(asAllowed ? "Checklist saved — Trading permitted" : "Checklist saved");
  }

  if (loading) return <div className="p-8 font-mono text-xs text-muted-foreground animate-pulse">Loading…</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl">
      <header>
        <div className="font-mono text-xs text-primary uppercase tracking-widest">// Pre-Session</div>
        <h1 className="text-3xl font-bold mt-1">Pre-Session Checklist</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete before any trade. Engine blocks execution if requirements fail.</p>
      </header>

      <Card className={`p-5 border ${allowed ? "border-success bg-success-soft" : "border-danger bg-danger-soft"}`}>
        <div className="flex items-center gap-3">
          {allowed ? <ShieldCheck className="size-7 text-success" /> : <ShieldX className="size-7 text-destructive" />}
          <div className="flex-1">
            <div className="font-bold">{allowed ? "All systems go — Trade permitted" : "Trade blocked"}</div>
            {!allowed && (
              <ul className="mt-1 text-xs text-destructive font-mono space-y-0.5">
                {blockers.map((b) => <li key={b}>• {b}</li>)}
              </ul>
            )}
          </div>
          <Button onClick={() => save(allowed)} disabled={!allowed}>Mark "Allowed to trade"</Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5 space-y-4">
          <Section title="Context" />
          <Field label="Date"><Input type="date" value={c.date} onChange={(e)=>set("date", e.target.value)} /></Field>
          <Field label="Session">
            <Select value={c.session} onValueChange={(v)=>set("session", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["NY AM","NY PM","London","Asia","Other"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Instrument"><Input value={c.instrument} onChange={(e)=>set("instrument", e.target.value)} /></Field>
          <Field label="HTF Bias"><Input value={c.htf_bias} onChange={(e)=>set("htf_bias", e.target.value)} placeholder="e.g. 4H bullish, weekly range" /></Field>
          <Field label="Daily Bias">
            <Select value={c.daily_bias} onValueChange={(v)=>set("daily_bias", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Bullish","Bearish","Neutral"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </Card>

        <Card className="p-5 space-y-3">
          <Section title="Pre-flight" />
          <Toggle k="news_checked" label="News checked" c={c} set={set} />
          <Toggle k="red_news_avoided" label="Red-folder news avoided" c={c} set={set} />
          <Toggle k="liquidity_marked" label="Liquidity levels marked" c={c} set={set} />
          <Toggle k="asia_range_marked" label="Prior session range marked" c={c} set={set} />
          <Toggle k="london_manipulation_checked" label="Manipulation / sweep checked" c={c} set={set} />
          <Toggle k="risk_calculated" label="Risk calculated" c={c} set={set} required />
          <Toggle k="max_trades_not_exceeded" label="Max trades not exceeded" c={c} set={set} />
        </Card>

        <Card className="p-5 space-y-3">
          <Section title="Strategy Model" />
          <Field label="Which strategy / model">
            <Select value={c.strategy_model} onValueChange={(v)=>set("strategy_model", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STRATEGY_MODELS.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Toggle k="po3_model_present" label="Strategy model confirmed on chart" c={c} set={set} required />
          <Toggle k="accumulation_identified" label="Setup / accumulation identified" c={c} set={set} />
          <Toggle k="manipulation_identified" label="Trigger / manipulation seen" c={c} set={set} />
          <Toggle k="distribution_confirmed" label="Confirmation / displacement" c={c} set={set} />
          <Toggle k="entry_model_valid" label="Entry model valid" c={c} set={set} />
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <Section title="State of Mind" />
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Emotional state">
            <Select value={c.emotional_state} onValueChange={(v)=>set("emotional_state", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Calm","Fearful","Greedy","Revenge mode","Tired"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Sleep quality">
            <Select value={c.sleep_quality} onValueChange={(v)=>set("sleep_quality", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Excellent","Good","OK","Poor"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={`Confidence: ${c.confidence_level}/10`}>
            <Slider value={[c.confidence_level]} min={1} max={10} step={1} onValueChange={([v])=>set("confidence_level", v)} />
          </Field>
        </div>
        <Field label="Daily plan notes">
          <Textarea rows={4} value={c.plan_notes} onChange={(e)=>set("plan_notes", e.target.value)} placeholder="Plan, levels, kill zone times, exit logic..." />
        </Field>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save(c.trade_allowed)}>Save draft</Button>
          <Button onClick={() => save(true)} disabled={!allowed}>
            <ShieldCheck className="size-4 mr-2" />Lock in — Allowed to trade
          </Button>
        </div>
      </Card>

      {!allowed && (
        <div className="flex items-start gap-2 text-xs text-warning bg-warning-soft border border-warning rounded p-3">
          <AlertTriangle className="size-4 mt-0.5" />
          <div>You cannot mark this session "Allowed to trade" until all required checks pass. The Trade Journal will warn before logging unsanctioned trades.</div>
        </div>
      )}
    </div>
  );
}

function Section({ title }: { title: string }) {
  return <div className="font-mono text-[11px] uppercase tracking-widest text-primary">// {title}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
function Toggle({ k, label, c, set, required }: { k: keyof Check; label: string; c: Check; set: any; required?: boolean }) {
  const v = !!c[k];
  return (
    <label className="flex items-center justify-between gap-3 text-sm cursor-pointer">
      <span className={`${required ? "font-medium" : ""}`}>{label}{required && <span className="text-destructive ml-1">*</span>}</span>
      <Checkbox checked={v} onCheckedChange={(x) => set(k, !!x)} />
    </label>
  );
}
