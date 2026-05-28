import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Target, Layers, TrendingUp, Activity, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/playbook")({ component: Playbook });

type Strategy = {
  slug: string;
  name: string;
  status: "live" | "draft" | "soon";
  to?: string;
  desc: string;
};

type Category = {
  key: string;
  name: string;
  icon: any;
  blurb: string;
  strategies: Strategy[];
};

const categories: Category[] = [
  {
    key: "ict",
    name: "ICT / Smart Money",
    icon: Target,
    blurb: "Inner Circle Trader concepts — liquidity, order blocks, FVGs, displacement.",
    strategies: [
      { slug: "po3", name: "PO3 — Power of Three", status: "live", to: "/po3",
        desc: "Accumulation → Manipulation → Distribution. NY kill-zone execution model." },
      { slug: "silver-bullet", name: "Silver Bullet", status: "soon",
        desc: "15-minute precision window for liquidity raids inside ICT macros." },
      { slug: "ote", name: "Optimal Trade Entry", status: "soon",
        desc: "62–79% Fibonacci retracement entries inside dealing ranges." },
    ],
  },
  {
    key: "smc",
    name: "Smart Money Concepts",
    icon: Layers,
    blurb: "Structure shifts, BOS / CHoCH, supply & demand zones.",
    strategies: [
      { slug: "bos-choch", name: "BOS / CHoCH Continuation", status: "soon",
        desc: "Trade with the break-of-structure once a CHoCH confirms intent." },
    ],
  },
  {
    key: "price-action",
    name: "Pure Price Action",
    icon: Activity,
    blurb: "Naked-chart setups — engulfings, pin bars, range plays.",
    strategies: [
      { slug: "range-reversion", name: "Range Reversion", status: "soon",
        desc: "Fade extremes of a confirmed range with tight invalidation." },
    ],
  },
  {
    key: "trend",
    name: "Trend Following",
    icon: TrendingUp,
    blurb: "MA pullbacks, breakouts, momentum continuation.",
    strategies: [
      { slug: "ema-pullback", name: "EMA Pullback", status: "soon",
        desc: "Buy pullbacks to the 20/50 EMA in a trending market." },
    ],
  },
];

function Playbook() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl">
      <header>
        <div className="font-mono text-xs text-primary uppercase tracking-widest">// Playbook</div>
        <h1 className="text-3xl font-bold mt-1">Strategy Playbook</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your library of trading strategies, grouped by methodology. Open one before every session.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Categories" value={String(categories.length)} />
        <KPI label="Live strategies" value={String(categories.flatMap(c => c.strategies).filter(s => s.status === "live").length)} />
        <KPI label="In draft" value={String(categories.flatMap(c => c.strategies).filter(s => s.status === "draft").length)} />
        <KPI label="Total" value={String(categories.flatMap(c => c.strategies).length)} />
      </div>

      <div className="space-y-5">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card key={cat.key} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-9 rounded bg-primary/15 border border-primary/30 grid place-items-center">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{cat.name}</div>
                  <div className="text-xs text-muted-foreground">{cat.blurb}</div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.strategies.map((s) => {
                  const inner = (
                    <div className="panel p-4 h-full flex flex-col gap-2 hover:border-primary/60 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm">{s.name}</div>
                        <StatusBadge status={s.status} />
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed flex-1">{s.desc}</div>
                      {s.to && (
                        <div className="flex items-center gap-1 text-xs text-primary font-mono uppercase tracking-widest pt-1">
                          Open <ArrowRight className="size-3" />
                        </div>
                      )}
                    </div>
                  );
                  return s.to ? (
                    <Link key={s.slug} to={s.to} className="block">{inner}</Link>
                  ) : (
                    <div key={s.slug} className="opacity-70">{inner}</div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 border-dashed">
        <div className="flex items-start gap-3">
          <Sparkles className="size-4 text-primary mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">Want to add your own strategy?</div>
            <div className="text-xs text-muted-foreground mt-1">
              Custom strategy editor coming soon — you'll be able to define entry rules, exit rules, and tag trades by strategy in the journal.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: Strategy["status"] }) {
  if (status === "live") return <Badge variant="outline" className="text-[9px] border-success text-success font-mono">LIVE</Badge>;
  if (status === "draft") return <Badge variant="outline" className="text-[9px] border-warning text-warning font-mono">DRAFT</Badge>;
  return <Badge variant="outline" className="text-[9px] font-mono">SOON</Badge>;
}
