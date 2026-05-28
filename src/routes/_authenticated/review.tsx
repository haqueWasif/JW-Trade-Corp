import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAccountData } from "@/hooks/useAccountData";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/review")({ component: ReviewPage });

const blank = () => ({
  id: undefined as string | undefined,
  date: new Date().toISOString().slice(0, 10),
  followed_plan: false,
  ny_only: true,
  respected_max_trades: true,
  respected_risk: true,
  followed_po3: true,
  biggest_mistake: "",
  best_decision: "",
  lesson_tomorrow: "",
  discipline_score: 7,
});

function ReviewPage() {
  const { data: acc } = useAccountData();
  const [r, setR] = useState<any>(blank());
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadList() {
    const { data } = await supabase.from("daily_reviews").select("*").order("date", { ascending: false }).limit(100);
    setList(data ?? []);
  }

  useEffect(() => {
    (async () => {
      await loadList();
      const { data } = await supabase
        .from("daily_reviews")
        .select("*")
        .eq("date", new Date().toISOString().slice(0, 10))
        .maybeSingle();
      if (data) setR(data);
      setLoading(false);
    })();
  }, []);

  function f(k: string, v: any) { setR({ ...r, [k]: v }); }

  async function onDateChange(date: string) {
    const { data } = await supabase.from("daily_reviews").select("*").eq("date", date).maybeSingle();
    if (data) setR(data);
    else setR({ ...blank(), date });
  }

  async function save() {
    if (!acc?.account) return;
    const payload: any = { ...r, user_id: acc.account.user_id };
    if (!payload.id) delete payload.id;
    const { data, error } = await supabase.from("daily_reviews").upsert(payload).select().maybeSingle();
    if (error) return toast.error(error.message);
    if (data) setR(data);
    await loadList();
    toast.success("Review saved");
  }

  async function del() {
    if (!r.id) { setR(blank()); return; }
    const { error } = await supabase.from("daily_reviews").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Review deleted");
    setR(blank());
    await loadList();
  }

  if (loading) return <div className="p-8 font-mono text-xs text-muted-foreground">Loading…</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-primary uppercase tracking-widest">// End of Day</div>
          <h1 className="text-3xl font-bold mt-1">Daily Review</h1>
          <p className="text-sm text-muted-foreground mt-1">Close the loop. Be honest. The journal compounds.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setR(blank())}>
          <Plus className="size-4 mr-2" /> New review
        </Button>
      </header>

      {list.length > 0 && (
        <Card className="p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 px-1">Past reviews — click to edit</div>
          <div className="flex flex-wrap gap-2">
            {list.map((it) => (
              <button
                key={it.id}
                onClick={() => setR(it)}
                className={`px-2.5 py-1.5 rounded border text-xs font-mono transition ${
                  r.id === it.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-accent"
                }`}
              >
                {it.date} · {it.discipline_score ?? "—"}/10
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Date</Label>
            <Input type="date" value={r.date} onChange={(e)=>onDateChange(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Discipline Score (1-10)</Label>
            <Input type="number" min={1} max={10} value={r.discipline_score ?? ""} onChange={(e)=>f("discipline_score", Number(e.target.value))} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {[
            ["followed_plan","Followed my plan"],
            ["ny_only","Traded NY only"],
            ["respected_max_trades","Respected max trades"],
            ["respected_risk","Respected risk %"],
            ["followed_po3","Followed strategy model"],
          ].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!r[k]} onCheckedChange={(v)=>f(k, !!v)} /> {l}
            </label>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Biggest mistake</Label>
          <Textarea rows={2} value={r.biggest_mistake ?? ""} onChange={(e)=>f("biggest_mistake", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Best decision</Label>
          <Textarea rows={2} value={r.best_decision ?? ""} onChange={(e)=>f("best_decision", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Lesson for tomorrow</Label>
          <Textarea rows={2} value={r.lesson_tomorrow ?? ""} onChange={(e)=>f("lesson_tomorrow", e.target.value)} />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={save} className="flex-1"><ClipboardCheck className="size-4 mr-2" /> {r.id ? "Update Review" : "Save Review"}</Button>
          {r.id && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="sm:w-auto"><Trash2 className="size-4 mr-2" /> Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this review?</AlertDialogTitle>
                  <AlertDialogDescription>This permanently removes the review for {r.date}.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={del}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </Card>
    </div>
  );
}
