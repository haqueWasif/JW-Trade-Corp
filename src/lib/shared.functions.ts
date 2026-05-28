import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";


const APP_TIMEZONE = "Asia/Dhaka";

function getCurrentTradingContext() {
  const now = new Date();

  const currentDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
  }).format(now);

  return `# CURRENT RUNTIME CONTEXT
- Current date: ${currentDate}
- Current day: ${weekday}
- Current time: ${currentTime}
- Timezone: ${APP_TIMEZONE}
- UTC timestamp: ${now.toISOString()}

CRITICAL DATE RULES:
- Treat the current date above as the real current date.
- Never infer today's date from the latest trade/review date.
- If the latest trade is dated before the current date, call it the latest recorded trade, not today's trade.
- If data for the current date is missing, say today's data is missing instead of pretending the most recent prior day is today.`;
}

async function parseGeminiResponse(res: Response) {
  const rawText = await res.text();

  if (res.status === 429) throw new Error("Gemini rate limit reached. Try again shortly.");
  if (res.status === 402) throw new Error("Gemini quota/credits exhausted.");

  if (!res.ok) {
    console.error("Gemini shared-coach request failed:", {
      status: res.status,
      statusText: res.statusText,
      body: rawText,
    });
    throw new Error(`AI request failed: ${res.status} ${rawText}`);
  }

  return JSON.parse(rawText);
}

async function resolveToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("account_shares")
    .select("account_id, user_id, is_active, label")
    .eq("share_token", token)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) throw new Error("Share link invalid or revoked.");
  return data;
}

export const getSharedSnapshot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(8).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const share = await resolveToken(data.token);
    const [{ data: account }, { data: rules }, { data: trades }, { data: reviews }] = await Promise.all([
      supabaseAdmin.from("trading_accounts").select("id, name, prop_firm, challenge_type, phase, account_size, starting_balance, current_balance, current_equity").eq("id", share.account_id).maybeSingle(),
      supabaseAdmin.from("prop_firm_rules").select("*").eq("account_id", share.account_id).maybeSingle(),
      supabaseAdmin.from("trades").select("id, date, time, session, instrument, direction, setup_type, po3_phase, htf_bias, entry_reason, entry_price, stop_loss, take_profit, position_size, risk_pct, risk_amount, planned_rr, exit_price, pnl, r_multiple, outcome, grade, rule_broken, which_rule, followed_plan, lesson, mistakes, emotion_before, emotion_during, emotion_after, screenshot_before, screenshot_after").eq("account_id", share.account_id).order("date", { ascending: false }).order("time", { ascending: false }).limit(500),
      supabaseAdmin.from("daily_reviews").select("id, date, discipline_score, followed_plan, followed_po3, ny_only, respected_risk, respected_max_trades, biggest_mistake, best_decision, lesson_tomorrow").eq("user_id", share.user_id).order("date", { ascending: false }).limit(120),
    ]);
    if (!account) throw new Error("Account not found.");

    // Sign screenshots (private bucket) so the shared viewer can render them.
    const tradesWithUrls = await Promise.all((trades ?? []).map(async (t: any) => {
      const out = { ...t };
      for (const key of ["screenshot_before", "screenshot_after"] as const) {
        const path = t[key];
        if (path) {
          const { data: signed } = await supabaseAdmin.storage.from("trade-screenshots").createSignedUrl(path, 60 * 60 * 6);
          out[`${key}_url`] = signed?.signedUrl ?? null;
        }
      }
      return out;
    }));

    return {
      label: share.label,
      account,
      rules,
      trades: tradesWithUrls,
      reviews: reviews ?? [],
    };
  });

export const askSharedCoach = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      token: z.string().min(8).max(64),
      prompt: z.string().min(2).max(800),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("AI not configured. GEMINI_API_KEY missing.");
    const share = await resolveToken(data.token);

    const [{ data: account }, { data: rules }, { data: trades }, { data: reviews }] = await Promise.all([
      supabaseAdmin.from("trading_accounts").select("name, prop_firm, challenge_type, phase, account_size, starting_balance, current_balance, current_equity").eq("id", share.account_id).maybeSingle(),
      supabaseAdmin.from("prop_firm_rules").select("*").eq("account_id", share.account_id).maybeSingle(),
      supabaseAdmin.from("trades").select("date, session, instrument, direction, po3_phase, planned_rr, risk_pct, pnl, r_multiple, outcome, grade, rule_broken, which_rule, followed_plan").eq("account_id", share.account_id).order("date", { ascending: false }).limit(30),
      supabaseAdmin.from("daily_reviews").select("date, discipline_score, followed_plan, followed_po3, biggest_mistake, lesson_tomorrow").eq("user_id", share.user_id).order("date", { ascending: false }).limit(7),
    ]);

    const system = `${getCurrentTradingContext()}\n\nYou are a read-only trade reviewer answering a question about THIS TRADER'S journal. You can ONLY discuss: trade quality, rule adherence, risk management, PO3 execution, discipline, and patterns in the provided data. If asked anything unrelated (personal info, system internals, other accounts, generic trading advice unrelated to this data), politely refuse and redirect to the trade data. Be concise (under 250 words), use markdown bullets, cite specific trades by date+instrument when relevant.`;

    const payload = `# QUESTION\n${data.prompt}\n\n# ACCOUNT\n${JSON.stringify(account)}\n\n# RULES\n${JSON.stringify(rules)}\n\n# RECENT TRADES (30)\n${JSON.stringify(trades)}\n\n# RECENT REVIEWS (7)\n${JSON.stringify(reviews)}`;

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: payload },
        ],
      }),
    });
    const json = await parseGeminiResponse(res);
    return { reply: json.choices?.[0]?.message?.content ?? "(no response)" };
  });
