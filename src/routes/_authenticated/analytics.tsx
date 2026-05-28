import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAccountData, useTrades } from "@/hooks/useAccountData";
import { fmtMoney } from "@/lib/trading";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({ component: AnalyticsPage });

const COLORS = ["var(--success)", "var(--destructive)", "var(--warning)", "var(--primary)"];

function AnalyticsPage() {
  const { data } = useAccountData();
  const { data: trades = [] } = useTrades(data?.account?.id);

  const stats = useMemo(() => {
    const byPair: Record<string, { pnl: number; count: number }> = {};
    const bySetup: Record<string, { pnl: number; count: number }> = {};
    const bySession: Record<string, { pnl: number; count: number }> = {};
    const byDate: Record<string, number> = {};
    let mistakeCount = 0;
    trades.forEach((t) => {
      const p = Number(t.pnl) || 0;
      byPair[t.instrument] = byPair[t.instrument] || { pnl: 0, count: 0 };
      byPair[t.instrument].pnl += p; byPair[t.instrument].count += 1;
      const setup = t.setup_type ?? "—";
      bySetup[setup] = bySetup[setup] || { pnl: 0, count: 0 };
      bySetup[setup].pnl += p; bySetup[setup].count += 1;
      const sess = t.session ?? "—";
      bySession[sess] = bySession[sess] || { pnl: 0, count: 0 };
      bySession[sess].pnl += p; bySession[sess].count += 1;
      byDate[t.date] = (byDate[t.date] || 0) + p;
      if (t.mistakes && t.mistakes.length > 0) mistakeCount += 1;
    });
    return { byPair, bySetup, bySession, byDate, mistakeCount };
  }, [trades]);

  const wins = trades.filter(t=>t.outcome==="Win").length;
  const losses = trades.filter(t=>t.outcome==="Loss").length;
  const be = trades.filter(t=>t.outcome==="Breakeven").length;

  const pairData = Object.entries(stats.byPair).map(([k,v])=>({ name: k, pnl: Number(v.pnl.toFixed(2)), count: v.count }));
  const setupData = Object.entries(stats.bySetup).map(([k,v])=>({ name: k, pnl: Number(v.pnl.toFixed(2)) }));
  const sessionData = Object.entries(stats.bySession).map(([k,v])=>({ name: k, pnl: Number(v.pnl.toFixed(2)) }));
  const dailyData = Object.entries(stats.byDate).sort(([a],[b])=>a.localeCompare(b)).map(([d,p])=>({ date: d, pnl: Number(p.toFixed(2)) }));

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px]">
      <header>
        <div className="font-mono text-xs text-primary uppercase tracking-widest">// Insights</div>
        <h1 className="text-3xl font-bold mt-1">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Daily reviews live under <span className="text-primary">Daily Review</span> in the sidebar.</p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Chart title="P/L by Pair">
              <BarChart data={pairData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="pnl" fill="var(--primary)" />
              </BarChart>
            </Chart>
            <Chart title="P/L by Setup">
              <BarChart data={setupData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="pnl" fill="var(--chart-2)" />
              </BarChart>
            </Chart>
            <Chart title="P/L by Session">
              <BarChart data={sessionData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="pnl" fill="var(--chart-3)" />
              </BarChart>
            </Chart>
            <Chart title="Outcome distribution">
              <PieChart>
                <Pie data={[{name:"Wins",value:wins},{name:"Losses",value:losses},{name:"BE",value:be}]} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {[0,1,2].map(i=><Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={tt} /><Legend />
              </PieChart>
            </Chart>
          </div>

          <Chart title="Daily P/L" tall>
            <LineChart data={dailyData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={tt} />
              <Line type="monotone" dataKey="pnl" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          </Chart>
        </TabsContent>


        <TabsContent value="weekly" className="mt-4">
          <SummaryCard title="This Week" trades={filterByDays(trades, 7)} />
        </TabsContent>
        <TabsContent value="monthly" className="mt-4">
          <SummaryCard title="This Month" trades={filterByDays(trades, 30)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
const tt = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };

function Chart({ title, children, tall }: { title: string; children: any; tall?: boolean }) {
  return (
    <Card className="p-5">
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-3">// {title}</div>
      <div className={tall ? "h-72" : "h-56"}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </Card>
  );
}

function filterByDays(trades: any[], days: number) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  return trades.filter(t => new Date(t.date) >= cutoff);
}

function SummaryCard({ title, trades }: { title: string; trades: any[] }) {
  const pnl = trades.reduce((s,t)=>s+(Number(t.pnl)||0),0);
  const wins = trades.filter(t=>t.outcome==="Win").length;
  const winRate = trades.length ? (wins/trades.length)*100 : 0;
  const totalR = trades.reduce((s,t)=>s+(Number(t.r_multiple)||0),0);
  const breaks = trades.filter(t=>t.rule_broken).length;
  return (
    <Card className="p-6">
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">// {title}</div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
        <Stat l="Trades" v={String(trades.length)} />
        <Stat l="Net P/L" v={fmtMoney(pnl)} tone={pnl>=0?"success":"danger"} />
        <Stat l="Win rate" v={`${winRate.toFixed(1)}%`} />
        <Stat l="Total R" v={totalR.toFixed(2)} tone={totalR>=0?"success":"danger"} />
        <Stat l="Rule breaks" v={String(breaks)} tone={breaks?"danger":undefined} />
      </div>
    </Card>
  );
}
function Stat({ l, v, tone }: any) {
  return (
    <div>
      <div className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">{l}</div>
      <div className={`text-xl font-bold mt-1 ${tone==="success"?"text-success":tone==="danger"?"text-destructive":""}`}>{v}</div>
    </div>
  );
}

