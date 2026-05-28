import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAccountData, useTrades } from "@/hooks/useAccountData";
import { computeStatus, fmtMoney, fmtPct, targetPctForPhase } from "@/lib/trading";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, AlertOctagon,
  TrendingUp, TrendingDown, Activity, Calendar as Cal, Target, BookOpen,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data, isLoading } = useAccountData();
  const { data: trades = [] } = useTrades(data?.account?.id);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTrades = trades.filter((t) => t.date === todayKey);
  const todayPnl = todayTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);

  const tradingDaysSet = useMemo(() => new Set(trades.map((t) => t.date)), [trades]);
  const tradingDays = tradingDaysSet.size;

  if (isLoading) {
    return <div className="p-8 font-mono text-xs text-muted-foreground animate-pulse">Loading account…</div>;
  }
  if (!data?.account || !data.rules) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="font-mono text-xs text-primary uppercase tracking-widest">// No account</div>
        <h1 className="text-3xl font-bold mt-1">Set up your first trading account</h1>
        <p className="text-sm text-muted-foreground mt-2">Head to <Link to="/accounts" className="text-primary underline">Accounts</Link> and describe your prop-firm setup in plain English — the AI will configure the rules for you.</p>
        <Button asChild className="mt-4"><Link to="/accounts">Create account</Link></Button>
      </div>
    );
  }
  const { account, rules } = data;
  const { dailyLimit, maxLimit, remainingDaily, remainingMax, status } =
    computeStatus({ account, rules, todayPnl });

  const targetPct = targetPctForPhase(account.phase, rules);
  const targetAmount = account.starting_balance * (targetPct / 100);
  const profit = account.current_balance - account.starting_balance;
  const targetProgress = targetAmount > 0 ? Math.max(0, Math.min(100, (profit / targetAmount) * 100)) : 0;

  // equity curve (cumulative PnL by date)
  const sortedByDate = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let cum = account.starting_balance;
  const equityData = sortedByDate.length
    ? sortedByDate.map((t) => { cum += Number(t.pnl) || 0; return { date: t.date, equity: Number(cum.toFixed(2)) }; })
    : [{ date: "start", equity: account.starting_balance }];

  const tradeAllowed =
    status !== "Breach Risk" &&
    todayTrades.length < (data.settings?.max_trades_per_day ?? 2) &&
    remainingDaily > 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-primary uppercase tracking-widest">// JW Trade Corp · Trading Desk</div>
          <h1 className="text-3xl font-bold mt-1">{account.name}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            {account.prop_firm} · {account.challenge_type} · <span className="text-foreground font-medium">{account.phase}</span>
          </div>
        </div>
        <TradeAllowedBox allowed={tradeAllowed} status={status} />
      </header>

      <div className="grid lg:grid-cols-4 gap-4">
        <StatCard label="Account Size" value={fmtMoney(account.account_size)} />
        <StatCard label="Current Balance" value={fmtMoney(account.current_balance)} accent={profit >= 0 ? "success" : "danger"} sub={`${profit >= 0 ? "+" : ""}${fmtMoney(profit)}`} />
        <StatCard label="Current Equity" value={fmtMoney(account.current_equity)} />
        <StatCard label="Today's P/L" value={fmtMoney(todayPnl)} accent={todayPnl >= 0 ? "success" : "danger"} sub={`${todayTrades.length} trade${todayTrades.length === 1 ? "" : "s"}`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <Header icon={Target} label="Phase Target" />
          <div className="flex items-baseline justify-between mt-3">
            <div className="text-2xl font-bold">{fmtMoney(targetAmount)}</div>
            <div className="font-mono text-xs text-muted-foreground">{targetPct}%</div>
          </div>
          <Progress value={targetProgress} className="mt-3" />
          <div className="text-xs text-muted-foreground mt-2">{targetProgress.toFixed(1)}% to target · {fmtMoney(Math.max(0, targetAmount - profit))} remaining</div>
        </Card>

        <Card className="p-5">
          <Header icon={ShieldAlert} label="Daily Loss Limit" />
          <div className="flex items-baseline justify-between mt-3">
            <div className="text-2xl font-bold">{fmtMoney(remainingDaily)}</div>
            <div className="font-mono text-xs text-muted-foreground">of {fmtMoney(dailyLimit)} ({rules.daily_loss_pct}%)</div>
          </div>
          <Progress value={((dailyLimit - remainingDaily) / dailyLimit) * 100} className="mt-3" />
          <div className="text-xs text-muted-foreground mt-2">Remaining drawdown room today</div>
        </Card>

        <Card className="p-5">
          <Header icon={ShieldAlert} label="Max Loss Limit" />
          <div className="flex items-baseline justify-between mt-3">
            <div className="text-2xl font-bold">{fmtMoney(remainingMax)}</div>
            <div className="font-mono text-xs text-muted-foreground">of {fmtMoney(maxLimit)} ({rules.max_loss_pct}%)</div>
          </div>
          <Progress value={((maxLimit - remainingMax) / maxLimit) * 100} className="mt-3" />
          <div className="text-xs text-muted-foreground mt-2">Total account drawdown room</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <Header icon={Activity} label="Equity Curve" />
          <div className="h-64 mt-4">
            <ResponsiveContainer>
              <LineChart data={equityData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="equity" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <Header icon={Cal} label="Session Status" />
          <Row k="Trading Days" v={`${tradingDays} / ${rules.min_trading_days}`} />
          <Row k="Min-day Progress" v={fmtPct(Math.min(100, (tradingDays / rules.min_trading_days) * 100))} />
          <Row k="Trades Today" v={`${todayTrades.length} / ${data.settings?.max_trades_per_day ?? 2}`} />
          <Row k="Today P/L" v={fmtMoney(todayPnl)} tone={todayPnl >= 0 ? "success" : "danger"} />
          <Row k="Open Floating P/L" v={fmtMoney(account.current_equity - account.current_balance)} />
          <div className="pt-3 border-t border-border flex gap-2">
            <Button asChild size="sm" className="flex-1"><Link to="/checklist"><BookOpen className="size-3.5 mr-1.5" />Checklist</Link></Button>
            <Button asChild size="sm" variant="outline" className="flex-1"><Link to="/journal">Journal</Link></Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "success" | "danger" }) {
  return (
    <Card className="p-5">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">{label}</div>
      <div className={`text-2xl font-bold mt-2 ${accent === "success" ? "text-success" : accent === "danger" ? "text-destructive" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

function Header({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-primary" />
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">{label}</div>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "success" | "danger" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-mono font-semibold ${tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : ""}`}>{v}</span>
    </div>
  );
}

function TradeAllowedBox({ allowed, status }: { allowed: boolean; status: string }) {
  const config = allowed
    ? { Icon: ShieldCheck, label: "TRADE ALLOWED", tone: "success" as const }
    : status === "Breach Risk"
      ? { Icon: AlertOctagon, label: "DO NOT TRADE", tone: "danger" as const }
      : status === "Danger"
        ? { Icon: AlertTriangle, label: "PROCEED WITH CAUTION", tone: "warning" as const }
        : { Icon: ShieldAlert, label: "REVIEW BEFORE TRADING", tone: "warning" as const };
  const cls = config.tone === "success"
    ? "bg-success-soft border-success glow-success"
    : config.tone === "danger"
      ? "bg-danger-soft border-danger glow-danger"
      : "bg-warning-soft border-warning";
  return (
    <div className={`px-5 py-3 rounded-lg border ${cls} flex items-center gap-3`}>
      <config.Icon className={`size-6 ${config.tone === "success" ? "text-success" : config.tone === "danger" ? "text-destructive" : "text-warning"}`} />
      <div>
        <div className="font-bold text-sm tracking-wide">{config.label}</div>
        <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">Status: {status}</div>
      </div>
    </div>
  );
}
