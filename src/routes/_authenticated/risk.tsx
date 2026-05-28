import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAccountData, useTrades } from "@/hooks/useAccountData";
import { computeStatus, fmtMoney } from "@/lib/trading";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/risk")({ component: RiskPage });

function RiskPage() {
  const { data } = useAccountData();
  const { data: trades = [] } = useTrades(data?.account?.id);
  const [riskPct, setRiskPct] = useState(0.5);
  const [slPips, setSlPips] = useState(20);
  const [pipValue, setPipValue] = useState(10); // $ per pip per 1.0 lot for EURUSD
  const [tpPips, setTpPips] = useState(40);

  if (!data?.account || !data.rules || !data.settings) return <div className="p-8 font-mono text-xs text-muted-foreground animate-pulse">Loading…</div>;
  const { account, rules, settings } = data;
  const todayKey = new Date().toISOString().slice(0,10);
  const todayPnl = trades.filter(t=>t.date===todayKey).reduce((s,t)=>s+(Number(t.pnl)||0),0);
  const status = computeStatus({ account, rules, todayPnl });

  const personalRiskAmt = (account.current_balance * riskPct) / 100;
  const firmDailyLimit = status.dailyLimit;
  const personalDailyLimit = (account.starting_balance * settings.personal_daily_stop_pct) / 100;
  const lotSize = slPips > 0 && pipValue > 0 ? personalRiskAmt / (slPips * pipValue) : 0;
  const reward = lotSize * tpPips * pipValue;
  const rr = personalRiskAmt > 0 ? reward / personalRiskAmt : 0;

  const checks = useMemo(() => [
    { ok: riskPct <= settings.risk_per_trade_pct, label: `Risk ≤ personal limit (${settings.risk_per_trade_pct}%)` },
    { ok: personalRiskAmt <= status.remainingDaily, label: "Risk fits inside firm daily limit room" },
    { ok: personalRiskAmt <= personalDailyLimit - Math.max(0, -todayPnl), label: `Risk fits inside personal daily stop (${settings.personal_daily_stop_pct}%)` },
    { ok: rr >= settings.min_rr, label: `RR ≥ minimum (${settings.min_rr}R)` },
    { ok: trades.filter(t=>t.date===todayKey).length < settings.max_trades_per_day, label: `Max trades not yet hit (${settings.max_trades_per_day}/day)` },
  ], [riskPct, personalRiskAmt, status.remainingDaily, personalDailyLimit, todayPnl, rr, settings, trades]);

  const allowed = checks.every(c=>c.ok);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl">
      <header>
        <div className="font-mono text-xs text-primary uppercase tracking-widest">// Pre-Trade</div>
        <h1 className="text-3xl font-bold mt-1">Risk Calculator</h1>
        <p className="text-sm text-muted-foreground mt-1">Size positions inside firm and personal limits.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6 space-y-4">
          <Sec icon={Calculator} title="Inputs" />
          <Num l="Risk per trade %" v={riskPct} on={setRiskPct} />
          <Num l="Stop loss (pips)" v={slPips} on={setSlPips} />
          <Num l="Take profit (pips)" v={tpPips} on={setTpPips} />
          <Num l="$ per pip per 1.0 lot" v={pipValue} on={setPipValue} />
          <div className="text-[11px] text-muted-foreground font-mono">Tip: EURUSD/GBPUSD ≈ $10, XAUUSD ≈ $1 per 0.01 pip, US30 ≈ $1.</div>
        </Card>

        <Card className="p-6 space-y-3">
          <Sec icon={ShieldAlert} title="Output" />
          <Row k="Risk $" v={fmtMoney(personalRiskAmt)} />
          <Row k="Position size (lots)" v={lotSize.toFixed(3)} />
          <Row k="Reward $" v={fmtMoney(reward)} />
          <Row k="RR" v={`${rr.toFixed(2)}R`} tone={rr >= settings.min_rr ? "success" : "danger"} />
          <div className="h-px bg-border my-2" />
          <Row k="Firm daily limit (remaining)" v={fmtMoney(status.remainingDaily)} />
          <Row k="Personal daily stop (limit)" v={fmtMoney(personalDailyLimit)} />
          <Row k="Max account loss room" v={fmtMoney(status.remainingMax)} />
        </Card>
      </div>

      <Card className={`p-5 border ${allowed ? "border-success bg-success-soft" : "border-danger bg-danger-soft"}`}>
        <div className="flex items-center gap-3 mb-3">
          {allowed ? <CheckCircle2 className="size-6 text-success" /> : <XCircle className="size-6 text-destructive" />}
          <div className="font-bold">{allowed ? "Trade meets all risk requirements" : "Trade fails one or more checks"}</div>
        </div>
        <ul className="space-y-1.5 text-sm">
          {checks.map((c,i) => (
            <li key={i} className="flex items-center gap-2">
              {c.ok ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />}
              <span className={c.ok ? "" : "text-destructive"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
function Sec({ icon: Icon, title }: any) {
  return <div className="flex items-center gap-2"><Icon className="size-4 text-primary" /><div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">// {title}</div></div>;
}
function Num({ l, v, on }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{l}</Label>
      <Input type="number" step="any" value={v} onChange={(e)=>on(parseFloat(e.target.value) || 0)} />
    </div>
  );
}
function Row({ k, v, tone }: { k: string; v: string; tone?: "success" | "danger" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-mono font-semibold ${tone==="success"?"text-success":tone==="danger"?"text-destructive":""}`}>{v}</span>
    </div>
  );
}
