import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAccountData } from "@/hooks/useAccountData";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { parseAccountSpec, createAccount, setActiveAccount, deleteAccount, createShare, toggleShare, deleteShare, listShares } from "@/lib/accounts.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Sparkles, Loader2, Check, Share2, Copy, Trash2, Link as LinkIcon, Wallet } from "lucide-react";
import { fmtMoney } from "@/lib/trading";

export const Route = createFileRoute("/_authenticated/accounts")({ component: AccountsPage });

function AccountsPage() {
  const { data } = useAccountData();
  const qc = useQueryClient();
  const setActive = useServerFn(setActiveAccount);
  const del = useServerFn(deleteAccount);

  const accounts = data?.accounts ?? [];
  const active = data?.account;

  async function makeActive(id: string) {
    try {
      await setActive({ data: { accountId: id } });
      qc.invalidateQueries();
      toast.success("Active account set");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this account and all its trades, checklists, and shares? This cannot be undone.")) return;
    try {
      await del({ data: { accountId: id } });
      qc.invalidateQueries();
      toast.success("Account deleted");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl">
      <header className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <div className="font-mono text-xs text-primary uppercase tracking-widest">// Accounts</div>
          <h1 className="text-3xl font-bold mt-1">Trading Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Each account is independent. Switch the active one to scope dashboards, journals, and analytics.</p>
        </div>
        <NewAccountDialog onSaved={() => qc.invalidateQueries()} />
      </header>

      {accounts.length === 0 && (
        <Card className="p-10 text-center space-y-3 border-dashed">
          <Wallet className="size-8 text-primary mx-auto" />
          <div className="font-semibold">No accounts yet</div>
          <p className="text-sm text-muted-foreground">Click <span className="text-primary">New Account</span> and describe it in plain English — e.g. "FundingPips 2.5k challenge standard 2 phase".</p>
        </Card>
      )}

      <div className="grid gap-4">
        {accounts.map((a) => (
          <Card key={a.id} className={`p-5 ${active?.id === a.id ? "border-primary/60 glow-primary" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold">{a.name}</h2>
                  {active?.id === a.id && <Badge className="text-[10px]">ACTIVE</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">
                  {a.prop_firm} · {a.challenge_type} · {a.phase} · {fmtMoney(a.account_size)}
                </div>
                <div className="text-xs mt-2">
                  Balance <span className="font-mono font-semibold">{fmtMoney(a.current_balance)}</span> ·
                  Equity <span className="font-mono font-semibold ml-1">{fmtMoney(a.current_equity)}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {active?.id !== a.id && (
                  <Button size="sm" variant="outline" onClick={() => makeActive(a.id)}>
                    <Check className="size-3.5 mr-1.5" /> Set active
                  </Button>
                )}
                <ShareManager accountId={a.id} />
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NewAccountDialog({ onSaved }: { onSaved: () => void }) {
  const parse = useServerFn(parseAccountSpec);
  const create = useServerFn(createAccount);
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<any>(null);

  async function runParse() {
    if (!desc.trim()) return;
    setBusy(true);
    try {
      const r = await parse({ data: { description: desc } });
      setDraft(r);
    } catch (e: any) { toast.error(e?.message ?? "AI parse failed"); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      await create({ data: { ...draft, setActive: true } });
      toast.success("Account created");
      onSaved();
      setOpen(false);
      setDesc(""); setDraft(null);
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setBusy(false); }
  }

  function updateDraft(path: string, v: any) {
    setDraft((d: any) => {
      const next = { ...d };
      if (path.startsWith("rules.")) {
        next.rules = { ...next.rules, [path.slice(6)]: v };
      } else {
        next[path] = v;
      }
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setDraft(null); setDesc(""); } }}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4 mr-1.5" /> New Account</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Set up a new account</DialogTitle></DialogHeader>

        {!draft && (
          <div className="space-y-3">
            <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Describe the account</Label>
            <Textarea
              rows={4}
              placeholder='e.g. "FundingPips 2.5k challenge standard 2 phase" or "FTMO 100k swing phase 1"'
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">The AI knows common firms (FundingPips, FTMO, MyForexFunds, The5ers, Topstep, Apex, E8, Goat). It'll fill in rules you didn't mention — you can edit before saving.</p>
            <Button onClick={runParse} disabled={busy || !desc.trim()} className="w-full">
              {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
              {busy ? "Parsing…" : "Parse with AI"}
            </Button>
          </div>
        )}

        {draft && (
          <div className="space-y-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// Account</div>
            <div className="grid md:grid-cols-2 gap-3">
              <F l="Name"><Input value={draft.name} onChange={(e)=>updateDraft("name", e.target.value)} /></F>
              <F l="Prop firm"><Input value={draft.prop_firm} onChange={(e)=>updateDraft("prop_firm", e.target.value)} /></F>
              <F l="Challenge type"><Input value={draft.challenge_type} onChange={(e)=>updateDraft("challenge_type", e.target.value)} /></F>
              <F l="Phase"><Input value={draft.phase} onChange={(e)=>updateDraft("phase", e.target.value)} /></F>
              <F l="Account size $"><Input type="number" value={draft.account_size} onChange={(e)=>updateDraft("account_size", parseFloat(e.target.value)||0)} /></F>
            </div>

            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// Rules</div>
            <div className="grid md:grid-cols-2 gap-3">
              <F l="Phase 1 target %"><Input type="number" step="any" value={draft.rules.phase1_target_pct} onChange={(e)=>updateDraft("rules.phase1_target_pct", parseFloat(e.target.value)||0)} /></F>
              <F l="Phase 2 target %"><Input type="number" step="any" value={draft.rules.phase2_target_pct} onChange={(e)=>updateDraft("rules.phase2_target_pct", parseFloat(e.target.value)||0)} /></F>
              <F l="Daily loss %"><Input type="number" step="any" value={draft.rules.daily_loss_pct} onChange={(e)=>updateDraft("rules.daily_loss_pct", parseFloat(e.target.value)||0)} /></F>
              <F l="Max loss %"><Input type="number" step="any" value={draft.rules.max_loss_pct} onChange={(e)=>updateDraft("rules.max_loss_pct", parseFloat(e.target.value)||0)} /></F>
              <F l="Min trading days"><Input type="number" value={draft.rules.min_trading_days} onChange={(e)=>updateDraft("rules.min_trading_days", parseInt(e.target.value)||0)} /></F>
              <F l="Inactivity days"><Input type="number" value={draft.rules.inactivity_days} onChange={(e)=>updateDraft("rules.inactivity_days", parseInt(e.target.value)||0)} /></F>
              <F l="Profit split %"><Input type="number" step="any" value={draft.rules.profit_split_pct ?? ""} onChange={(e)=>updateDraft("rules.profit_split_pct", e.target.value === "" ? null : parseFloat(e.target.value))} /></F>
              <F l="Consistency rule %"><Input type="number" step="any" value={draft.rules.consistency_rule_pct ?? ""} onChange={(e)=>updateDraft("rules.consistency_rule_pct", e.target.value === "" ? null : parseFloat(e.target.value))} /></F>
              <div className="flex items-center gap-3"><Switch checked={!!draft.rules.weekend_holding_allowed} onCheckedChange={(v)=>updateDraft("rules.weekend_holding_allowed", v)} /> <span className="text-sm">Weekend holding allowed</span></div>
              <div className="flex items-center gap-3"><Switch checked={!!draft.rules.news_trading_allowed} onCheckedChange={(v)=>updateDraft("rules.news_trading_allowed", v)} /> <span className="text-sm">News trading allowed</span></div>
            </div>
            <F l="Notes"><Textarea rows={2} value={draft.rules.notes ?? ""} onChange={(e)=>updateDraft("rules.notes", e.target.value)} /></F>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>Back</Button>
              <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="size-4 mr-2 animate-spin"/> : null}Create account</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShareManager({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const list = useServerFn(listShares);
  const create = useServerFn(createShare);
  const toggle = useServerFn(toggleShare);
  const del = useServerFn(deleteShare);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["shares", accountId],
    queryFn: () => list({ data: { accountId } }),
    enabled: open,
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function add() {
    setBusy(true);
    try {
      await create({ data: { accountId, label: label || undefined } });
      setLabel("");
      refetch();
      toast.success("Share link created");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }
  async function flip(id: string, isActive: boolean) {
    await toggle({ data: { id, isActive } });
    refetch();
  }
  async function remove(id: string) {
    if (!confirm("Revoke this share link permanently?")) return;
    await del({ data: { id } });
    refetch();
  }
  function copy(token: string) {
    navigator.clipboard.writeText(`${origin}/shared/${token}`);
    toast.success("Link copied");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Share2 className="size-3.5 mr-1.5" /> Share</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Share links</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Viewers get read-only access to trade journal, daily reviews, and the AI Q&A — scoped to this account only. They cannot edit anything.</p>

        <div className="flex gap-2">
          <Input placeholder="Label (optional) — e.g. 'Investor', 'Mentor'" value={label} onChange={(e)=>setLabel(e.target.value)} />
          <Button onClick={add} disabled={busy}><Plus className="size-3.5 mr-1.5" />Create</Button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {(data?.shares ?? []).length === 0 && <div className="text-xs text-muted-foreground text-center py-6">No share links yet.</div>}
          {(data?.shares ?? []).map((s: any) => (
            <Card key={s.id} className="p-3 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <LinkIcon className="size-3.5 text-primary shrink-0" />
                  <code className="text-xs truncate">{origin}/shared/{s.share_token}</code>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">
                  {s.label ? `${s.label} · ` : ""}{s.is_active ? "ACTIVE" : "REVOKED"}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => copy(s.share_token)} title="Copy"><Copy className="size-3.5" /></Button>
              <Switch checked={s.is_active} onCheckedChange={(v) => flip(s.id, v)} />
              <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
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
