import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const FIRM_KNOWLEDGE = `Known prop firm rules (use as defaults when user doesn't specify):

FundingPips Standard 2-Step: phase1_target 8%, phase2_target 5%, daily_loss 5%, max_loss 10%, min_trading_days 3, profit_split 80, weekend_holding true, news_trading true.
FundingPips 1-Step: target 10%, daily_loss 4%, max_loss 6%, profit_split 80.
FundingPips Instant: target 10%, daily_loss 3%, max_loss 6%, profit_split 60.

FTMO Challenge (2-step): phase1_target 10%, phase2_target 5%, daily_loss 5%, max_loss 10%, min_trading_days 4, profit_split 80, weekend_holding false (closes Friday).
FTMO Swing: same targets, weekend_holding true, news_trading true.

MyForexFunds Evaluation: phase1_target 8%, phase2_target 5%, daily_loss 5%, max_loss 12%, profit_split 75.
MyForexFunds Rapid: target 10%, daily_loss 5%, max_loss 8%, profit_split 50.

The5ers Bootcamp: target 6% per level, daily_loss 5%, max_loss 5%, profit_split 50-100 scaling.
The5ers High-Stakes: phase1_target 8%, phase2_target 5%, daily_loss 5%, max_loss 10%.

Topstep Trading Combine (futures): no profit target %, fixed profit goal varies, daily_loss varies by account size, trailing max drawdown.

Apex Trader Funding (futures): target $1500-$5000 by size, daily_loss N/A, trailing drawdown, profit_split 100/90.

E8 Funding: phase1_target 8%, phase2_target 5%, daily_loss 5%, max_loss 8%.
Goat Funded: phase1_target 8%, phase2_target 4%, daily_loss 5%, max_loss 10%.`;

export const parseAccountSpec = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ description: z.string().min(3).max(1000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured.");

    const system = `You parse trader-supplied prop-firm account specs into structured JSON. Use the firm knowledge below to fill defaults the user didn't mention. If something is genuinely unknown, leave nullable fields null. Be precise with numbers.\n\n${FIRM_KNOWLEDGE}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.description },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_account",
            description: "Submit the parsed prop-firm account configuration.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Short label e.g. 'FundingPips $2.5k P1'" },
                prop_firm: { type: "string" },
                challenge_type: { type: "string", description: "e.g. 'Standard 2-Step', '1-Step', 'Swing', 'Instant'" },
                phase: { type: "string", enum: ["Phase 1", "Phase 2", "Funded"] },
                account_size: { type: "number" },
                rules: {
                  type: "object",
                  properties: {
                    phase1_target_pct: { type: "number" },
                    phase2_target_pct: { type: "number" },
                    daily_loss_pct: { type: "number" },
                    max_loss_pct: { type: "number" },
                    min_trading_days: { type: "integer" },
                    phase1_max_days: { type: ["integer", "null"] },
                    phase2_max_days: { type: ["integer", "null"] },
                    profit_split_pct: { type: ["number", "null"] },
                    weekend_holding_allowed: { type: "boolean" },
                    news_trading_allowed: { type: "boolean" },
                    consistency_rule_pct: { type: ["number", "null"] },
                    inactivity_days: { type: "integer" },
                    notes: { type: "string" },
                  },
                  required: ["phase1_target_pct", "phase2_target_pct", "daily_loss_pct", "max_loss_pct", "min_trading_days", "weekend_holding_allowed", "news_trading_allowed", "inactivity_days", "notes"],
                },
              },
              required: ["name", "prop_firm", "challenge_type", "phase", "account_size", "rules"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_account" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI request failed: ${res.status}`);

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI did not return structured data.");
    const parsed = JSON.parse(call.function.arguments);
    return parsed;
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      name: z.string().min(1).max(120),
      prop_firm: z.string().min(1).max(80),
      challenge_type: z.string().min(1).max(80),
      phase: z.string().min(1).max(40),
      account_size: z.number().positive(),
      rules: z.object({
        phase1_target_pct: z.number(),
        phase2_target_pct: z.number(),
        daily_loss_pct: z.number(),
        max_loss_pct: z.number(),
        min_trading_days: z.number().int(),
        phase1_max_days: z.number().int().nullable().optional(),
        phase2_max_days: z.number().int().nullable().optional(),
        profit_split_pct: z.number().nullable().optional(),
        weekend_holding_allowed: z.boolean(),
        news_trading_allowed: z.boolean(),
        consistency_rule_pct: z.number().nullable().optional(),
        inactivity_days: z.number().int(),
        notes: z.string().optional().default(""),
      }),
      setActive: z.boolean().default(true),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: acc, error: e1 } = await supabase
      .from("trading_accounts")
      .insert({
        user_id: userId,
        name: data.name,
        prop_firm: data.prop_firm,
        challenge_type: data.challenge_type,
        phase: data.phase,
        account_size: data.account_size,
        starting_balance: data.account_size,
        current_balance: data.account_size,
        current_equity: data.account_size,
      })
      .select()
      .single();
    if (e1 || !acc) throw new Error(e1?.message ?? "Failed to create account");

    const r = data.rules;
    const { error: e2 } = await supabase.from("prop_firm_rules").insert({
      account_id: acc.id,
      user_id: userId,
      phase1_target_pct: r.phase1_target_pct,
      phase2_target_pct: r.phase2_target_pct,
      daily_loss_pct: r.daily_loss_pct,
      max_loss_pct: r.max_loss_pct,
      min_trading_days: r.min_trading_days,
      phase1_max_days: r.phase1_max_days ?? null,
      phase2_max_days: r.phase2_max_days ?? null,
      profit_split_pct: r.profit_split_pct ?? null,
      weekend_holding_allowed: r.weekend_holding_allowed,
      news_trading_allowed: r.news_trading_allowed,
      consistency_rule_pct: r.consistency_rule_pct ?? null,
      inactivity_days: r.inactivity_days,
      notes: r.notes ?? "",
    });
    if (e2) throw new Error(e2.message);

    if (data.setActive) {
      await supabase.from("profiles").update({ active_account_id: acc.id }).eq("id", userId);
    }
    return { account: acc };
  });

export const setActiveAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accountId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update({ active_account_id: data.accountId }).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accountId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // delete dependents (RLS already scopes to user_id)
    await supabase.from("trades").delete().eq("account_id", data.accountId);
    await supabase.from("daily_checklists").delete().eq("account_id", data.accountId);
    await supabase.from("prop_firm_rules").delete().eq("account_id", data.accountId);
    await supabase.from("account_shares").delete().eq("account_id", data.accountId);
    const { error } = await supabase.from("trading_accounts").delete().eq("id", data.accountId).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function randomToken(len = 24) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

export const createShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      accountId: z.string().uuid(),
      label: z.string().max(80).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // verify ownership
    const { data: acc } = await supabase.from("trading_accounts").select("id").eq("id", data.accountId).eq("user_id", userId).maybeSingle();
    if (!acc) throw new Error("Account not found");
    const token = randomToken(24);
    const { data: row, error } = await supabase.from("account_shares").insert({
      account_id: data.accountId,
      user_id: userId,
      share_token: token,
      label: data.label ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    return { share: row };
  });

export const toggleShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("account_shares").update({ is_active: data.isActive }).eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("account_shares").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listShares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accountId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase.from("account_shares")
      .select("*").eq("account_id", data.accountId).eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { shares: rows ?? [] };
  });
