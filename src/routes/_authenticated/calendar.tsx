import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAccountData, useTrades } from "@/hooks/useAccountData";
import { fmtMoney } from "@/lib/trading";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/calendar")({ component: CalendarPage });

function CalendarPage() {
  const { data } = useAccountData();
  const { data: trades = [] } = useTrades(data?.account?.id);
  const [cursor, setCursor] = useState(new Date());

  const byDate = useMemo(() => {
    const m: Record<string, { pnl: number; count: number; broke: boolean }> = {};
    trades.forEach((t) => {
      m[t.date] = m[t.date] || { pnl: 0, count: 0, broke: false };
      m[t.date].pnl += Number(t.pnl) || 0;
      m[t.date].count += 1;
      if (t.rule_broken) m[t.date].broke = true;
    });
    return m;
  }, [trades]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthPnl = Object.entries(byDate)
    .filter(([d]) => d.startsWith(`${year}-${String(month+1).padStart(2,"0")}`))
    .reduce((s, [,v]) => s + v.pnl, 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl">
      <header className="flex justify-between items-end">
        <div>
          <div className="font-mono text-xs text-primary uppercase tracking-widest">// Calendar</div>
          <h1 className="text-3xl font-bold mt-1">Trading Calendar</h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Month P/L</div>
          <div className={`text-2xl font-bold ${monthPnl >= 0 ? "text-success" : "text-destructive"}`}>{fmtMoney(monthPnl)}</div>
        </div>
      </header>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="icon" onClick={()=>setCursor(new Date(year, month-1, 1))}><ChevronLeft className="size-4" /></Button>
          <div className="font-semibold">{first.toLocaleString("en-US", { month: "long", year: "numeric" })}</div>
          <Button variant="outline" size="icon" onClick={()=>setCursor(new Date(year, month+1, 1))}><ChevronRight className="size-4" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="aspect-square" />;
            const key = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const day = byDate[key];
            const tone = day ? (day.pnl >= 0 ? "success" : "danger") : null;
            return (
              <div key={i} className={`aspect-square panel p-1.5 flex flex-col text-left ${
                tone === "success" ? "bg-success-soft border-success" :
                tone === "danger" ? "bg-danger-soft border-danger" : ""
              }`}>
                <div className="text-xs font-mono">{d}</div>
                {day && (
                  <>
                    <div className={`text-xs font-bold mt-auto ${day.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                      {day.pnl >= 0 ? "+" : ""}{day.pnl.toFixed(0)}
                    </div>
                    <div className="text-[9px] text-muted-foreground">{day.count} trade{day.count>1?"s":""}{day.broke?" ⚠":""}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend cls="bg-success-soft border-success" label="Green day" />
        <Legend cls="bg-danger-soft border-danger" label="Red day" />
        <Legend cls="" label="No trade" />
        <span>⚠ = rule break</span>
      </div>
    </div>
  );
}
function Legend({ cls, label }: any) {
  return <span className="flex items-center gap-2"><span className={`size-4 rounded border ${cls || "border-border"}`} />{label}</span>;
}
