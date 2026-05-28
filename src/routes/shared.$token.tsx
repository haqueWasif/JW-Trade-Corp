import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSharedSnapshot, askSharedCoach } from "@/lib/shared.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtMoney } from "@/lib/trading";
import { Sparkles, Send, Loader2, Eye, TrendingUp, TrendingDown, Image as ImageIcon } from "lucide-react";
import jwLogo from "@/assets/jw-logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/shared/$token")({
  head: () => ({
    meta: [
      { title: "JW Trade Corp — Shared Trading Journal" },
      { name: "description", content: "Read-only view of a JW Trade Corp trading journal." },
      { property: "og:title", content: "JW Trade Corp — Shared Trading Journal" },
      { property: "og:description", content: "Read-only view of a JW Trade Corp trading journal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharedPage,
});

function SharedPage() {
  const { token } = Route.useParams();
  const fetchSnap = useServerFn(getSharedSnapshot);
  const ask = useServerFn(askSharedCoach);
  const { data, isLoading, error } = useQuery({
    queryKey: ["shared", token],
    queryFn: () => fetchSnap({ data: { token } }),
    retry: false,
  });

  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  async function send() {
    if (!prompt.trim()) return;
    setBusy(true); setReply("");
    try {
      const r = await ask({ data: { token, prompt } });
      setReply(r.reply);
    } catch (e: any) { toast.error(e?.message ?? "AI failed"); }
    finally { setBusy(false); }
  }

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center font-mono text-xs text-muted-foreground animate-pulse">Loading shared journal…</div>;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center max-w-md">
          <div className="font-mono text-xs text-destructive uppercase tracking-widest">// Access denied</div>
          <h1 className="text-2xl font-bold mt-2">Share link invalid or revoked</h1>
          <p className="text-sm text-muted-foreground mt-2">{(error as any)?.message ?? "Ask the account owner for a fresh link."}</p>
        </div>
      </div>
    );
  }

  const { account, trades, reviews } = data;
  const totalPnl = trades.reduce((s: number, t: any) => s + (Number(t.pnl) || 0), 0);
  const wins = trades.filter((t: any) => t.outcome === "Win").length;
  const losses = trades.filter((t: any) => t.outcome === "Loss").length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded bg-background border border-primary/40 grid place-items-center glow-primary overflow-hidden">
              <img src={jwLogo} alt="JW Trade Corp" className="size-full object-contain" />
            </div>
            <div>
              <div className="font-display font-bold tracking-tight">{account.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                {account.prop_firm} · {account.challenge_type} · {account.phase}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]"><Eye className="size-3 mr-1" /> READ-ONLY SHARE</Badge>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Balance" value={fmtMoney(account.current_balance)} />
          <Stat label="Equity" value={fmtMoney(account.current_equity)} />
          <Stat label="Trades" value={String(trades.length)} />
          <Stat label="Win rate" value={`${winRate.toFixed(1)}%`} />
          <Stat label="Net P/L" value={fmtMoney(totalPnl)} accent={totalPnl >= 0 ? "success" : "danger"} />
        </div>

        <Tabs defaultValue="trades">
          <TabsList>
            <TabsTrigger value="trades">Trade Journal</TabsTrigger>
            <TabsTrigger value="reviews">Daily Reviews</TabsTrigger>
            <TabsTrigger value="coach">Ask Coach</TabsTrigger>
          </TabsList>

          <TabsContent value="trades">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
                    <tr>{["Date","Session","Pair","Dir","Setup","PO3","RR","R","P/L","Grade","Rule","Plan",""].map(h=><th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {trades.length === 0 && <tr><td colSpan={13} className="text-center py-12 text-muted-foreground text-sm">No trades logged yet.</td></tr>}
                    {trades.map((t: any) => (
                      <tr key={t.id} className="border-t border-border hover:bg-accent/30 cursor-pointer" onClick={() => setDetail(t)}>
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{t.date}</td>
                        <td className="px-3 py-2 text-xs">{t.session}</td>
                        <td className="px-3 py-2 font-medium">{t.instrument}</td>
                        <td className="px-3 py-2">{t.direction === "Buy" ? <TrendingUp className="size-3.5 text-success inline" /> : <TrendingDown className="size-3.5 text-destructive inline" />} <span className="text-xs ml-1">{t.direction}</span></td>
                        <td className="px-3 py-2 text-xs">{t.setup_type}</td>
                        <td className="px-3 py-2 text-xs">{t.po3_phase}</td>
                        <td className="px-3 py-2 font-mono text-xs">{t.planned_rr ?? "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs">{t.r_multiple != null ? Number(t.r_multiple).toFixed(2) : "—"}</td>
                        <td className={`px-3 py-2 font-mono font-semibold ${Number(t.pnl) >= 0 ? "text-success" : "text-destructive"}`}>{fmtMoney(Number(t.pnl) || 0)}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className="font-mono">{t.grade ?? "—"}</Badge></td>
                        <td className="px-3 py-2">{t.rule_broken ? <Badge variant="destructive" className="text-[10px]">BROKEN</Badge> : <Badge variant="outline" className="text-[10px] border-success text-success">CLEAN</Badge>}</td>
                        <td className="px-3 py-2 text-xs">{t.followed_plan ? "✓" : "—"}</td>
                        <td className="px-3 py-2 text-xs">{(t.screenshot_before_url || t.screenshot_after_url) ? <ImageIcon className="size-3.5 text-primary" /> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="grid gap-3">
              {reviews.length === 0 && <Card className="p-10 text-center text-sm text-muted-foreground">No daily reviews yet.</Card>}
              {reviews.map((r: any) => (
                <Card key={r.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs">{r.date}</div>
                    <Badge variant="outline" className="font-mono">Discipline {r.discipline_score ?? "—"}/10</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    <Pill ok={r.followed_plan}>Plan</Pill>
                    <Pill ok={r.followed_po3}>PO3</Pill>
                    <Pill ok={r.ny_only}>NY only</Pill>
                    <Pill ok={r.respected_risk}>Risk</Pill>
                    <Pill ok={r.respected_max_trades}>Max trades</Pill>
                  </div>
                  {r.best_decision && <div className="text-sm"><span className="text-muted-foreground text-xs">Best decision: </span>{r.best_decision}</div>}
                  {r.biggest_mistake && <div className="text-sm"><span className="text-muted-foreground text-xs">Mistake: </span>{r.biggest_mistake}</div>}
                  {r.lesson_tomorrow && <div className="text-sm"><span className="text-muted-foreground text-xs">Tomorrow: </span>{r.lesson_tomorrow}</div>}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="coach">
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Ask the AI coach about this journal</div>
              </div>
              <p className="text-xs text-muted-foreground">Scoped to the trades and reviews shown above. Refuses anything off-topic.</p>
              <Textarea rows={3} placeholder="e.g. Are the trades following the PO3 model? Any rule breaches I should know about?" value={prompt} onChange={(e)=>setPrompt(e.target.value)} />
              <Button onClick={send} disabled={busy || !prompt.trim()}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
                Ask
              </Button>
              {reply && (
                <Card className="p-4 border-primary/40 bg-primary-soft mt-3">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{reply}</div>
                </Card>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest pt-4">
          JW Trade Corp · Read-only shared journal
        </div>

      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">{detail.date} · {detail.session}</span>
                  <span>{detail.instrument}</span>
                  <Badge variant="outline">{detail.direction}</Badge>
                  <Badge variant="outline">{detail.setup_type}</Badge>
                  {detail.po3_phase && <Badge variant="outline">{detail.po3_phase}</Badge>}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="Entry" value={detail.entry_price ?? "—"} />
                <Stat label="Stop" value={detail.stop_loss ?? "—"} />
                <Stat label="Target" value={detail.take_profit ?? "—"} />
                <Stat label="Exit" value={detail.exit_price ?? "—"} />
                <Stat label="Risk %" value={detail.risk_pct ?? "—"} />
                <Stat label="Planned RR" value={detail.planned_rr ?? "—"} />
                <Stat label="R" value={detail.r_multiple != null ? Number(detail.r_multiple).toFixed(2) : "—"} />
                <Stat label="P/L" value={fmtMoney(Number(detail.pnl) || 0)} accent={Number(detail.pnl) >= 0 ? "success" : "danger"} />
              </div>

              {detail.htf_bias && <Section label="HTF bias">{detail.htf_bias}</Section>}
              {detail.entry_reason && <Section label="Entry reason">{detail.entry_reason}</Section>}
              {detail.mistakes && <Section label="Mistakes">{detail.mistakes}</Section>}
              {detail.lesson && <Section label="Lesson">{detail.lesson}</Section>}
              {detail.rule_broken && detail.which_rule && <Section label="Rule broken">{detail.which_rule}</Section>}
              {(detail.emotion_before || detail.emotion_during || detail.emotion_after) && (
                <Section label="Emotions">{[detail.emotion_before, detail.emotion_during, detail.emotion_after].filter(Boolean).join(" → ")}</Section>
              )}

              {(detail.screenshot_before_url || detail.screenshot_after_url) && (
                <div className="grid md:grid-cols-2 gap-3 pt-2">
                  {detail.screenshot_before_url && (
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Before</div>
                      <a href={detail.screenshot_before_url} target="_blank" rel="noreferrer">
                        <img src={detail.screenshot_before_url} alt="Before" className="rounded border border-border w-full" />
                      </a>
                    </div>
                  )}
                  {detail.screenshot_after_url && (
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">After</div>
                      <a href={detail.screenshot_after_url} target="_blank" rel="noreferrer">
                        <img src={detail.screenshot_after_url} alt="After" className="rounded border border-border w-full" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm whitespace-pre-wrap">{children}</div>
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
function Pill({ ok, children }: { ok: any; children: React.ReactNode }) {
  return <Badge variant="outline" className={ok ? "border-success text-success" : "border-destructive text-destructive"}>{children} {ok ? "✓" : "✗"}</Badge>;
}
