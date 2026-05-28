import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Quick-action prompts (chat mode)
const QUICK_PROMPTS: Record<string, string> = {
  today: "Analyze today's trades. Summarize performance, emotional state, mistakes, and what to do tomorrow.",
  week: "Analyze the last 7 days of trades. Identify pattern, focus area, and weekly grade.",
  mistake: "Find the most costly recurring mistake across all trades. Quantify cost in R and $.",
  should_trade: "Based on recent equity, emotion state, rule breaches, and today's checklist, advise whether to trade today.",
  last_trade: "Grade the most recent trade against the strategy playbook (HTF bias alignment, model discipline, risk).",
  tomorrow_plan: "Generate a structured kill-zone plan for tomorrow based on last 5 sessions (bias, pairs, levels to watch).",
};

const FORMATTING_RULES = `

FORMATTING (STRICT):
- Output rich GitHub-Flavored Markdown. Use **bold** for key terms, *italics* for nuance, and \`inline code\` for tickers, prices, and levels (e.g. \`EURUSD\`, \`1.0856\`).
- Use ## and ### headings to structure sections. Use bullet lists and numbered lists generously. Use > blockquotes for warnings or rule breaches.
- Use markdown tables for comparisons, level lists, or scorecards.
- Use LaTeX math via $...$ (inline) and $$...$$ (block) for ALL numeric formulas: R-multiples, risk %, position sizing, expectancy. Examples: $R = \\frac{|entry - target|}{|entry - stop|}$, $Risk\\% = \\frac{loss}{equity} \\times 100$.
- Use --- horizontal rules to separate major sections.
- Never output raw HTML. Never wrap the whole response in a code block.`;

const CHAT_SYSTEM = `You are an elite prop-firm trading coach. Adapt to the trader's chosen strategy and session (which may be ICT/PO3, SMC, supply & demand, breakout, mean reversion, or anything else they describe). Do not assume a specific model — read the user's message, attachments, and trade history to infer which framework they're using, then critique within that framework. Be direct, specific, quantitative. Use R-multiples and dollar amounts. Surface rule breaches loudly. Keep responses under 450 words.

When the user attaches chart screenshots, READ THE CHART CAREFULLY: identify HTF bias, liquidity pools, FVGs, OBs, displacement, MSS, and judge entry quality based on what you actually see.

When the user attaches a market data document (news, COT, fundamentals, calendars), extract the relevant facts and integrate them.

ALWAYS read the user's typed message — it contains their analysis, plan, and context. Never claim "no plan was submitted" if there is text in the user message. Quote or paraphrase their plan when critiquing it.${FORMATTING_RULES}`;

const PRETRADE_SYSTEM = `You are an elite pre-trade analyst. The trader is about to take a position and wants your read BEFORE pulling the trigger.

CRITICAL: Read the user's typed message carefully — it contains their written analysis, bias, plan, entry, stop, and target. NEVER say "no plan was submitted" if the user has typed anything. Quote their plan when validating or challenging it.

CRITICAL: Read attached chart screenshots in detail. Identify what you actually see: HTF bias, liquidity sweeps, FVGs, OBs, displacement, MSS, session levels. Do not give generic answers.

CRITICAL: Read attached technical/fundamental PDFs. Extract concrete facts (news risk, COT, sentiment, economic events) and integrate them.

If context is genuinely missing (no instrument named AND no charts AND no plan), ask 2-4 targeted questions before analyzing.

When you analyze, output in this exact structure:
- **Instrument & Bias** (HTF direction, why)
- **Key Levels** (liquidity, FVG, OB, session highs/lows — from the chart)
- **Trade Idea** (entry zone, stop, target, R:R)
- **Confluence Score** (X/10) — list confluences and conflicts
- **Fundamental Check** (news risk, sentiment, anything from attached reports)
- **Trader's Plan Critique** (quote/paraphrase their written plan, then validate or challenge it specifically)
- **Verdict** — TAKE / SKIP / WAIT, with one-line reason

Be willing to say SKIP. Never validate a weak setup.${FORMATTING_RULES}`;

const AttachmentSchema = z.object({
  name: z.string().max(200),
  mimeType: z.string().max(100),
  dataBase64: z.string().min(10).max(16_000_000),
});

async function buildContextBlock(supabase: any, userId: string): Promise<string> {
  const { data: profile } = await supabase.from("profiles").select("active_account_id").eq("id", userId).maybeSingle();
  const activeId = (profile as any)?.active_account_id as string | null;

  const [{ data: trades }, { data: checklists }, { data: reviews }, { data: account }, { data: rules }, { data: settings }] = await Promise.all([
    (activeId
      ? supabase.from("trades").select("*").eq("account_id", activeId).order("date", { ascending: false }).order("time", { ascending: false }).limit(30)
      : supabase.from("trades").select("*").order("date", { ascending: false }).order("time", { ascending: false }).limit(30)),
    supabase.from("daily_checklists").select("*").order("date", { ascending: false }).limit(7),
    supabase.from("daily_reviews").select("*").order("date", { ascending: false }).limit(7),
    (activeId
      ? supabase.from("trading_accounts").select("*").eq("id", activeId).maybeSingle()
      : supabase.from("trading_accounts").select("*").eq("user_id", userId).limit(1).maybeSingle()),
    (activeId
      ? supabase.from("prop_firm_rules").select("*").eq("account_id", activeId).maybeSingle()
      : supabase.from("prop_firm_rules").select("*").eq("user_id", userId).limit(1).maybeSingle()),
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const latestChecklist = Array.isArray(checklists) && checklists.length ? checklists[0] : null;
  const activeStrategy = (latestChecklist as any)?.strategy_model || (settings as any)?.preferred_strategy || null;
  const activeSession = (latestChecklist as any)?.session || (settings as any)?.preferred_session || null;
  const activeInstrument = (latestChecklist as any)?.instrument || null;
  const activeBias = (latestChecklist as any)?.htf_bias || (latestChecklist as any)?.daily_bias || null;
  const activePlan = (latestChecklist as any)?.plan_notes || null;

  return `# TRADER CONTEXT (reference only — do not summarize unless asked)

## ACTIVE STRATEGY FRAMEWORK (use THIS to frame all analysis)
- Strategy / Model: ${activeStrategy ?? "(not set — infer from user message)"}
- Session: ${activeSession ?? "(unknown)"}
- Instrument focus: ${activeInstrument ?? "(unknown)"}
- Current bias: ${activeBias ?? "(unknown)"}
- Today's plan notes: ${activePlan ?? "(none)"}

When critiquing trades or setups, judge them WITHIN the active strategy's rules. If the trader picked "Silver Bullet", evaluate kill-zone timing and FVG entries. If "PO3", look for accumulation/manipulation/distribution. If "SMC", look for liquidity sweeps and MSS. Adapt your language and checklist to the chosen model.

## ACCOUNT
${JSON.stringify(account, null, 2)}

## PROP-FIRM RULES
${JSON.stringify(rules, null, 2)}

## USER SETTINGS
${JSON.stringify(settings, null, 2)}

## LAST 30 TRADES
${JSON.stringify(trades, null, 2)}

## LAST 7 CHECKLISTS (most recent first — strategy_model field is authoritative)
${JSON.stringify(checklists, null, 2)}

## LAST 7 REVIEWS
${JSON.stringify(reviews, null, 2)}`;
}

function buildUserContent(text: string, attachments: { name: string; mimeType: string; dataBase64: string }[]) {
  if (!attachments.length) return text;
  const parts: any[] = [{ type: "text", text }];
  for (const a of attachments) {
    parts.push({
      type: "image_url",
      image_url: { url: `data:${a.mimeType};base64,${a.dataBase64}` },
    });
  }
  return parts;
}

// ============ List conversations ============
export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ kind: z.enum(["chat", "pre_trade"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("coach_conversations")
      .select("id,title,kind,created_at,updated_at")
      .eq("user_id", userId)
      .eq("kind", data.kind)
      .order("updated_at", { ascending: false })
      .limit(50);
    return { conversations: rows ?? [] };
  });

// ============ Get messages in a conversation ============
export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: convo } = await supabase
      .from("coach_conversations")
      .select("*")
      .eq("id", data.conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!convo) throw new Error("Conversation not found");
    const { data: messages } = await supabase
      .from("coach_messages")
      .select("id,role,content,attachments,created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    return { conversation: convo, messages: messages ?? [] };
  });

// ============ Delete conversation ============
export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("coach_conversations").delete().eq("id", data.conversationId).eq("user_id", userId);
    return { ok: true };
  });

// ============ Send a message (creates conversation if needed) ============
export const sendCoachMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      conversationId: z.string().uuid().optional(),
      kind: z.enum(["chat", "pre_trade"]),
      message: z.string().min(1).max(8000),
      attachments: z.array(AttachmentSchema).max(6).optional(),
      quickAction: z.string().optional(), // for chat mode quick-action buttons
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("AI not configured. GEMINI_API_KEY missing.");

    const attachments = data.attachments ?? [];

    // Get or create conversation
    let conversationId = data.conversationId;
    if (!conversationId) {
      const title = data.message.slice(0, 60).replace(/\s+/g, " ").trim() || (data.kind === "pre_trade" ? "Pre-trade analysis" : "New conversation");
      const { data: created, error } = await supabase
        .from("coach_conversations")
        .insert({ user_id: userId, kind: data.kind, title })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      conversationId = created!.id;
    } else {
      // Verify ownership
      const { data: owned } = await supabase.from("coach_conversations").select("id").eq("id", conversationId).eq("user_id", userId).maybeSingle();
      if (!owned) throw new Error("Conversation not found");
    }

    // Load prior messages
    const { data: priorRows } = await supabase
      .from("coach_messages")
      .select("role,content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    const prior = priorRows ?? [];

    // Build system + context. Context only injected on first message of the conversation.
    const systemPrompt = data.kind === "pre_trade" ? PRETRADE_SYSTEM : CHAT_SYSTEM;
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (prior.length === 0) {
      const ctx = await buildContextBlock(supabase, userId);
      messages.push({ role: "system", content: ctx });
    }

    for (const m of prior) {
      messages.push({ role: m.role, content: m.content });
    }

    // User's new message — prepend quick-action instruction if used
    const quickPrefix = data.quickAction && QUICK_PROMPTS[data.quickAction] ? `[QUICK ACTION: ${QUICK_PROMPTS[data.quickAction]}]\n\n` : "";
    const userText = `${quickPrefix}${data.message}`.trim();
    const userContent = buildUserContent(userText, attachments);
    messages.push({ role: "user", content: userContent });

    // Persist user message
    await supabase.from("coach_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "user",
      content: userText,
      attachments: attachments.length ? attachments.map((a) => ({ name: a.name, mimeType: a.mimeType })) : null,
    });

    const hasImages = attachments.some((a) => a.mimeType.startsWith("image/") || a.mimeType === "application/pdf");

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: hasImages ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (res.status === 429) throw new Error("Rate limit reached. Try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace Settings.");
    if (!res.ok) throw new Error(`AI request failed: ${res.status}`);

    const json = await res.json();
    const reply: string = json.choices?.[0]?.message?.content ?? "(no response)";

    await supabase.from("coach_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      content: reply,
    });

    // Touch conversation updated_at
    await supabase.from("coach_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    return { conversationId, reply };
  });
