import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, Loader2, Send, Paperclip, X, FileText, Image as ImageIcon, MessageSquare } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { listConversations, getConversation, sendCoachMessage, deleteConversation } from "@/lib/coach.functions";
import { HistoryList } from "@/routes/_authenticated/coach";
import { toast } from "sonner";
import { Markdown } from "@/components/Markdown";

export const Route = createFileRoute("/_authenticated/pre-trade")({ component: PreTradePage });

type Attach = { name: string; mimeType: string; dataBase64: string; size: number };
type Msg = { id: string; role: string; content: string; attachments: any; created_at: string };
type Convo = { id: string; title: string; kind: string; updated_at: string };

const MAX_FILES = 6;
const MAX_BYTES = 10 * 1024 * 1024;

async function fileToAttach(f: File): Promise<Attach> {
  const buf = await f.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return { name: f.name, mimeType: f.type || "application/octet-stream", dataBase64: btoa(binary), size: f.size };
}

const TEMPLATE = `Instrument:
Bias (HTF):
Session:
Entry zone / trigger:
Stop:
Target:
Planned R:R:
My reasoning / confluences:
News / fundamental notes:
`;

function PreTradePage() {
  const list = useServerFn(listConversations);
  const get = useServerFn(getConversation);
  const send = useServerFn(sendCoachMessage);
  const del = useServerFn(deleteConversation);

  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<Attach[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function refreshConvos() {
    try {
      const r = await list({ data: { kind: "pre_trade" } });
      setConvos(r.conversations as Convo[]);
    } catch (e: any) { toast.error(e?.message ?? "Failed to load history"); }
  }

  async function openConvo(id: string) {
    setActiveId(id);
    try {
      const r = await get({ data: { conversationId: id } });
      setMessages(r.messages as Msg[]);
    } catch (e: any) { toast.error(e?.message ?? "Failed to load conversation"); }
  }

  function newConvo() {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setFiles([]);
  }

  useEffect(() => { refreshConvos(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  async function onPickFiles(l: FileList | null) {
    if (!l) return;
    const next = [...files];
    for (const f of Array.from(l)) {
      if (next.length >= MAX_FILES) { toast.error(`Max ${MAX_FILES} files`); break; }
      if (f.size > MAX_BYTES) { toast.error(`${f.name} > 10MB`); continue; }
      const ok = f.type.startsWith("image/") || f.type === "application/pdf";
      if (!ok) { toast.error(`${f.name}: images or PDFs only`); continue; }
      next.push(await fileToAttach(f));
    }
    setFiles(next);
  }

  async function submit() {
    const text = input.trim();
    if (!text && files.length === 0) return;
    setBusy(true);
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`, role: "user", content: text,
      attachments: files.map((f) => ({ name: f.name, mimeType: f.mimeType })),
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    const attachToSend = files.map(({ name, mimeType, dataBase64 }) => ({ name, mimeType, dataBase64 }));
    setInput("");
    setFiles([]);
    try {
      const r = await send({ data: {
        conversationId: activeId ?? undefined,
        kind: "pre_trade",
        message: text || "(see attachments)",
        attachments: attachToSend.length ? attachToSend : undefined,
      } });
      if (!activeId) setActiveId(r.conversationId);
      const fresh = await get({ data: { conversationId: r.conversationId } });
      setMessages(fresh.messages as Msg[]);
      refreshConvos();
    } catch (e: any) {
      toast.error(e?.message ?? "AI request failed");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally { setBusy(false); }
  }

  async function removeConvo(id: string) {
    if (!confirm("Delete this analysis?")) return;
    try {
      await del({ data: { conversationId: id } });
      if (activeId === id) newConvo();
      refreshConvos();
    } catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  }

  const [histOpen, setHistOpen] = useState(false);
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] lg:h-screen">
      <aside className="hidden md:flex w-72 shrink-0 border-r border-border bg-card/40 flex-col">
        <HistoryList convos={convos} activeId={activeId} onNew={newConvo} onOpen={openConvo} onDelete={removeConvo} label="Pre-Trade" newLabel="New analysis" />
      </aside>
      <Sheet open={histOpen} onOpenChange={setHistOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <HistoryList convos={convos} activeId={activeId} onNew={() => { newConvo(); setHistOpen(false); }} onOpen={(id) => { openConvo(id); setHistOpen(false); }} onDelete={removeConvo} label="Pre-Trade" newLabel="New analysis" />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="p-3 md:p-4 border-b border-border flex items-center gap-2 md:gap-3">
          <Button variant="outline" size="icon" className="size-8 md:hidden shrink-0" onClick={() => setHistOpen(true)}>
            <MessageSquare className="size-4" />
          </Button>
          <Target className="size-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold truncate">Pre-Trade Analysis</h1>
            <p className="text-[11px] md:text-xs text-muted-foreground hidden sm:block">Submit charts, reports, and your plan. Get a TAKE / SKIP / WAIT verdict.</p>
          </div>
        </header>


        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4">
          {messages.length === 0 && (
            <Card className="max-w-2xl mx-auto p-5 space-y-3">
              <div className="font-semibold">How to get the best analysis</div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Attach your HTF + LTF chart screenshots</li>
                <li>Attach any technical or fundamental report PDF you have</li>
                <li>Type your own analysis: instrument, bias, entry, stop, target, why</li>
                <li>The coach will quote your plan, validate it, score confluence, and give a verdict</li>
              </ul>
              <Button size="sm" variant="outline" onClick={() => setInput(TEMPLATE)}>
                Insert plan template
              </Button>
            </Card>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[92%] md:max-w-[80%] rounded-lg p-3 md:p-4 ${
                m.role === "user" ? "bg-primary/15 border border-primary/30" : "bg-card border border-border"
              }`}>
                {m.attachments && Array.isArray(m.attachments) && m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {m.attachments.map((a: any, i: number) => (
                      <Badge key={i} variant="outline" className="gap-1 text-[10px]">
                        {a.mimeType?.startsWith("image/") ? <ImageIcon className="size-2.5" /> : <FileText className="size-2.5" />}
                        {a.name}
                      </Badge>
                    ))}
                  </div>
                )}
                <Markdown>{m.content}</Markdown>
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Analyzing…
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 space-y-2">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <Badge key={i} variant="outline" className="gap-1.5 py-1 pr-1">
                  {f.mimeType.startsWith("image/") ? <ImageIcon className="size-3" /> : <FileText className="size-3" />}
                  <span className="text-[11px] max-w-[160px] truncate">{f.name}</span>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="ml-1 hover:text-destructive">
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label className="flex items-center justify-center size-10 rounded-md border border-input cursor-pointer hover:bg-accent shrink-0">
              <Paperclip className="size-4 text-muted-foreground" />
              <Input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e)=>onPickFiles(e.target.files)} />
            </label>
            <Textarea
              rows={4}
              placeholder="Paste your analysis, plan, instrument, bias, entry, stop, target…"
              value={input}
              onChange={(e)=>setInput(e.target.value)}
              className="resize-none"
            />
            <Button disabled={busy || (!input.trim() && files.length === 0)} onClick={submit}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
