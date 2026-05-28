import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Target, Crosshair, Compass, AlertTriangle, CheckCircle2, XCircle, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/po3")({ component: PO3 });

function PO3() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl">
      <header>
        <Link to="/playbook" className="font-mono text-xs text-muted-foreground hover:text-primary uppercase tracking-widest inline-flex items-center gap-1">
          <ChevronLeft className="size-3" /> Strategy Playbook
        </Link>
        <div className="font-mono text-xs text-primary uppercase tracking-widest mt-2">// ICT / Smart Money</div>
        <h1 className="text-3xl font-bold mt-1">PO3 — Power of Three</h1>
        <p className="text-sm text-muted-foreground mt-1">Your NY-session execution model. Read before every session.</p>
      </header>

      <Card className="p-6">
        <SectionTitle icon={Compass} title="What is PO3?" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          Power of Three is a 3-phase model of price delivery used to identify high-probability
          intraday entries. Each phase has a job: build position quietly, trick retail traders,
          then deliver in the intended direction.
        </p>
        <div className="grid md:grid-cols-3 gap-3 mt-5">
          {[
            { Icon: Compass, t: "Accumulation", d: "Range / consolidation where smart money builds positions. No trades — observe." },
            { Icon: AlertTriangle, t: "Manipulation", d: "False move that sweeps liquidity above/below the range. Entry window opens." },
            { Icon: Crosshair, t: "Distribution", d: "Displacement and shift in market structure in the true direction. Execute." },
          ].map((p) => (
            <div key={p.t} className="panel p-4">
              <p.Icon className="size-5 text-primary mb-2" />
              <div className="font-semibold">{p.t}</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.d}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle icon={Target} title="NY Session Execution Process" />
        <ol className="space-y-3 text-sm">
          {[
            "Mark Asia range, previous day high/low, weekly highs/lows.",
            "Wait for London manipulation to set the day's liquidity targets.",
            "At NY open, identify which liquidity pool is being targeted.",
            "Wait for the sweep — do NOT enter before manipulation prints.",
            "Confirm displacement / market structure shift on 5m or 15m.",
            "Calculate risk and RR. If RR < your minimum, pass.",
            "Execute one well-defined trade. No revenge, no chasing.",
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="size-6 shrink-0 rounded bg-primary/15 border border-primary/30 grid place-items-center font-mono text-xs text-primary">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6">
          <SectionTitle icon={CheckCircle2} title="Valid setup conditions" tone="success" />
          <ul className="text-sm space-y-2">
            {[
              "Clear HTF bias (4H + Daily aligned)",
              "Liquidity sweep at expected level",
              "Displacement candle in expected direction",
              "Entry within or above your minimum RR",
              "Inside NY kill zone (8:30–11:00 ET or 13:30–16:00 ET)",
              "Emotional state: calm, focused",
            ].map((s) => <li key={s} className="flex gap-2"><CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />{s}</li>)}
          </ul>
        </Card>
        <Card className="p-6">
          <SectionTitle icon={XCircle} title="No-trade conditions" tone="danger" />
          <ul className="text-sm space-y-2">
            {[
              "Red-folder news within ±15 minutes",
              "No clear sweep / manipulation",
              "Choppy, low-volatility tape",
              "RR below your minimum (2R)",
              "Already hit max trades or daily stop",
              "Emotional state: revenge, tired, greedy",
              "Outside NY session",
            ].map((s) => <li key={s} className="flex gap-2"><XCircle className="size-4 text-destructive shrink-0 mt-0.5" />{s}</li>)}
          </ul>
        </Card>
      </div>

      <Card className="p-6">
        <SectionTitle icon={Target} title="Execution rules — non-negotiable" />
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          {[
            "Trade only during NY session.",
            "Mark Asia range and liquidity pools before NY open.",
            "Wait for the sweep before entry.",
            "Wait for displacement / structure shift.",
            "Enter only if RR ≥ minimum.",
            "No chasing, no FOMO entries.",
            "No revenge trading after a loss.",
            "No random trades outside the model.",
          ].map((s) => (
            <div key={s} className="panel px-3 py-2 font-mono text-xs">• {s}</div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, tone }: any) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`size-4 ${tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-primary"}`} />
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">// {title}</div>
    </div>
  );
}
