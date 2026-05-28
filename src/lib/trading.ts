// Shared types + helpers
export type Account = {
  id: string;
  user_id: string;
  name: string;
  prop_firm: string;
  challenge_type: string;
  phase: string;
  account_size: number;
  starting_balance: number;
  current_balance: number;
  current_equity: number;
  is_active: boolean;
};

export type Rules = {
  id: string;
  account_id: string;
  phase1_target_pct: number;
  phase2_target_pct: number;
  daily_loss_pct: number;
  max_loss_pct: number;
  min_trading_days: number;
  inactivity_days: number;
};

export type Settings = {
  id: string;
  user_id: string;
  risk_per_trade_pct: number;
  personal_daily_stop_pct: number;
  max_trades_per_day: number;
  stop_after_losses: number;
  min_rr: number;
  preferred_session: string;
  timezone: string;
  default_pairs: string[];
};

export type Trade = {
  id: string;
  date: string;
  time?: string | null;
  session?: string | null;
  instrument: string;
  direction: string;
  setup_type?: string | null;
  po3_phase?: string | null;
  htf_bias?: string | null;
  entry_reason?: string | null;
  entry_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  position_size?: number | null;
  risk_pct?: number | null;
  risk_amount?: number | null;
  reward_amount?: number | null;
  planned_rr?: number | null;
  exit_price?: number | null;
  pnl: number;
  r_multiple?: number | null;
  outcome?: string | null;
  emotion_before?: string | null;
  emotion_during?: string | null;
  emotion_after?: string | null;
  mistakes?: string | null;
  rule_broken?: boolean | null;
  which_rule?: string | null;
  lesson?: string | null;
  grade?: string | null;
  followed_plan?: boolean | null;
};

export function targetPctForPhase(phase: string, rules: Rules) {
  if (phase === "Phase 2") return rules.phase2_target_pct;
  if (phase === "Funded") return 0;
  return rules.phase1_target_pct;
}

export function computeStatus(args: {
  account: Account;
  rules: Rules;
  todayPnl: number;
}) {
  const { account, rules, todayPnl } = args;
  const dailyLimit = account.starting_balance * (rules.daily_loss_pct / 100);
  const maxLimit = account.starting_balance * (rules.max_loss_pct / 100);
  const equityDrawdown = Math.max(0, account.starting_balance - account.current_equity);
  const dailyUsed = Math.max(0, -todayPnl);
  const remainingDaily = Math.max(0, dailyLimit - dailyUsed);
  const remainingMax = Math.max(0, maxLimit - equityDrawdown);

  let status: "Safe" | "Warning" | "Danger" | "Breach Risk" = "Safe";
  const dailyPctUsed = dailyUsed / dailyLimit;
  const maxPctUsed = equityDrawdown / maxLimit;
  if (dailyPctUsed >= 1 || maxPctUsed >= 1) status = "Breach Risk";
  else if (dailyPctUsed >= 0.75 || maxPctUsed >= 0.75) status = "Danger";
  else if (dailyPctUsed >= 0.5 || maxPctUsed >= 0.5) status = "Warning";

  return { dailyLimit, maxLimit, remainingDaily, remainingMax, status };
}

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
export const fmtPct = (n: number) => `${n.toFixed(2)}%`;
