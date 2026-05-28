import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Brain, Calendar, AlertTriangle, BarChart3, Lightbulb, Loader2, Send,
  Paperclip, X, FileText, Image as ImageIcon, Plus, Trash2, MessageSquare,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { listConversations, getConversation, sendCoachMessage, deleteConversation } from "@/lib/coach.functions";
import { toast } from "sonner";
import { Markdown } from "@/components/Markdown";

export const Route = createFileRoute("/_authenticated/coach")({ component: CoachPage });

const quickActions = [
  { Icon: Calendar, label: "Analyze today", action: "today", prompt: "Analyze today's trades for me." },
  { Icon: BarChart3, label: "Analyze this week", action: "week", prompt: "Analyze the last 7 days." },
  { Icon: AlertTriangle, label: "Biggest mistake", action: "mistake", prompt: "What's my biggest recurring mistake?" },
  { Icon: Brain, label: "Should I trade today?", action: "should_trade", prompt: "Should I trade today?" },
  { Icon: Lightbulb, label: "Review last trade", action: "last_trade", prompt: "Review my last trade." },
  { Icon: Sparkles, label: "Plan tomorrow", action: "tomorrow_plan", prompt: "Plan tomorrow's session." },
];

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

function CoachPage() {
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
      const r = await list({ data: { kind: "chat" } });
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

  async function submit(messageOverride?: string, quickAction?: string) {
    const text = (messageOverride ?? input).trim();
    if (!text && files.length === 0) return;
    setBusy(true);
    // Optimistic user message
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
        kind: "chat",
        message: text || "(see attachments)",
        attachments: attachToSend.length ? attachToSend : undefined,
        quickAction,
      } });
      if (!activeId) setActiveId(r.conversationId);
      // Reload messages from server to get persisted ids
      const fresh = await get({ data: { conversationId: r.conversationId } });
      setMessages(fresh.messages as Msg[]);
      refreshConvos();
    } catch (e: any) {
      toast.error(e?.message ?? "AI request failed");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setBusy(false);
    }
  }

  async function removeConvo(id: string) {
    if (!confirm("Delete this conversation?")) return;
    try {
      await del({ data: { conversationId: id } });
      if (activeId === id) newConvo();
      refreshConvos();
    } catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  }

  const [histOpen, setHistOpen] = useState(false);
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] lg:h-screen">
      {/* History sidebar - desktop */}
      <aside className="hidden md:flex w-72 shrink-0 border-r border-border bg-card/40 flex-col">
        <HistoryList convos={convos} activeId={activeId} onNew={newConvo} onOpen={openConvo} onDelete={removeConvo} label="AI Coach" newLabel="New chat" />
      </aside>

      {/* History drawer - mobile */}
      <Sheet open={histOpen} onOpenChange={setHistOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <HistoryList convos={convos} activeId={activeId} onNew={() => { newConvo(); setHistOpen(false); }} onOpen={(id) => { openConvo(id); setHistOpen(false); }} onDelete={removeConvo} label="AI Coach" newLabel="New chat" />
        </SheetContent>
      </Sheet>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="p-3 md:p-4 border-b border-border flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8 md:hidden shrink-0" onClick={() => setHistOpen(true)}>
            <MessageSquare className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold truncate">AI Trading Coach</h1>
            <p className="text-[11px] md:text-xs text-muted-foreground hidden sm:block">Chat with full memory. Attach charts or PDFs.</p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto space-y-4">
              <Card className="p-5">
                <div className="font-semibold mb-3">Start with a quick action</div>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((a) => (
                    <Button
                      key={a.action}
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      className="justify-start"
                      onClick={() => submit(a.prompt, a.action)}
                    >
                      <a.Icon className="size-3.5 mr-2 text-primary" />
                      {a.label}
                    </Button>
                  ))}
                </div>
              </Card>
              <p className="text-center text-xs text-muted-foreground">
                Or type a question below. Attach screenshots or PDFs for chart / market analysis.
              </p>
            </div>
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
                <Loader2 className="size-4 animate-spin" /> Coach is thinking…
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
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
              rows={2}
              placeholder="Ask anything… (Shift+Enter for new line)"
              value={input}
              onChange={(e)=>setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              className="resize-none"
            />
            <Button disabled={busy || (!input.trim() && files.length === 0)} onClick={() => submit()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryList({ convos, activeId, onNew, onOpen, onDelete, label, newLabel }: {
  convos: Convo[]; activeId: string | null; onNew: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void; label: string; newLabel: string;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">// {label}</div>
        <Button size="sm" className="w-full" onClick={onNew}>
          <Plus className="size-3.5 mr-1.5" /> {newLabel}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {convos.length === 0 && (
          <div className="text-xs text-muted-foreground p-3">No conversations yet.</div>
        )}
        {convos.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs cursor-pointer ${
              activeId === c.id ? "bg-primary/15 border border-primary/30" : "hover:bg-accent/40"
            }`}
            onClick={() => onOpen(c.id)}
          >
            <MessageSquare className="size-3 shrink-0 text-muted-foreground" />
            <div className="flex-1 truncate">{c.title}</div>
            <button
              className="opacity-60 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export { HistoryList };
