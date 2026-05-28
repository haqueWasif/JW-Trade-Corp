# Multi-Account + Public Share

Two features, shipped together.

## 1. Multi-account with AI setup

Today the system seeds one hardcoded FundingPips $2.5k account. Move to a true multi-account model where the user spins up any prop-firm config via natural language ("FundingPips 2.5k challenge standard 2-phase", "FTMO 50k swing", "MyForexFunds 100k instant", etc.).

### Schema changes
- Add `active_account_id` to `profiles` so the app knows which account context to render.
- Remove the auto-seed of the default account in `handle_new_user()` — new users land on an empty state with a "Create your first account" CTA.
- `prop_firm_rules`: add `phase1_max_days`, `phase2_max_days`, `profit_split_pct`, `weekend_holding_allowed`, `news_trading_allowed`, `consistency_rule_pct`, `notes` (some exist, broaden defaults to nullable).
- New table `account_shares`: `id, account_id, user_id (owner), share_token (unique), is_active, created_at, label`. RLS: owner manages, plus a `SECURITY DEFINER` lookup function `get_share_by_token(token)` so anonymous viewers can resolve a token without exposing the table.

### AI account setup
- New server fn `parseAccountSpec({ description })` → calls Lovable AI (google/gemini-2.5-flash) with structured tool-calling. Returns:
  ```ts
  {
    name, prop_firm, challenge_type, phase, account_size,
    rules: { phase1_target_pct, phase2_target_pct, daily_loss_pct, max_loss_pct,
             min_trading_days, max_trading_days, profit_split_pct,
             weekend_holding_allowed, news_trading_allowed, consistency_rule_pct, notes }
  }
  ```
- Knowledge baked into the system prompt: common firm rules (FundingPips, FTMO, MyForexFunds, The5ers, Topstep, Apex) so it can fill defaults the user didn't mention.
- New route `/accounts` — list of accounts, "+ New account" opens a dialog with:
  1. Chat textarea ("Describe your account…").
  2. AI parses → preview card with editable fields.
  3. Confirm → insert `trading_accounts` + `prop_firm_rules` rows, set as active.
- Account switcher in `AppShell` header (dropdown showing active account, links to `/accounts`).

### App-wide scoping
- `useAccountData` reads `profiles.active_account_id` instead of `.limit(1)`. All existing queries are already keyed on `account_id`, so this becomes the single switch.
- Settings page gains per-account rule editor (was already there for `prop_firm_rules`).

## 2. Public share for journal / review

Goal: send a link → viewer sees read-only Trade Journal, Daily Review, and an AI Q&A scoped to that account. Nothing else.

### Routes
- `/accounts` → "Share" button per account → creates a row in `account_shares`, copies `https://…/shared/{token}` to clipboard.
- New PUBLIC route `/shared/$token` (NOT under `_authenticated`) with its own minimal layout:
  - Tabs: **Trades**, **Daily Reviews**, **Ask Coach**.
  - Read-only — no edit/delete affordances.

### Public data access
- Server fn `getSharedAccount({ token })` (no auth middleware, uses `supabaseAdmin`):
  - Resolves token → account_id via `account_shares` (must be `is_active=true`).
  - Returns: account summary, rules, trades (no screenshots URLs — or signed URLs only), reviews. Strips emails, user_id, settings.
- Server fn `askSharedCoach({ token, prompt })`:
  - Resolves token → account_id, pulls last 30 trades + 7 reviews for THAT account only.
  - Same Lovable AI call, system prompt locked to "answer only questions about whether the displayed trades follow rules / look healthy. Refuse anything else."
  - Rate-limit: simple in-memory? No — record `last_asked_at` on `account_shares` and reject if < 10s ago.

### Security
- `account_shares` policies: owner full CRUD; anon **no** direct select. All public reads go through the server fns above which validate token + scope to that account_id.
- Screenshots stay in the private bucket; shared view either omits them or generates short-lived signed URLs server-side.

## Technical details

Files:
- Migration: `active_account_id` on profiles, drop seed from `handle_new_user`, new `account_shares` table + RLS + `get_share_by_token` definer fn, extra `prop_firm_rules` columns.
- `src/lib/accounts.functions.ts` — `parseAccountSpec`, `createAccount`, `setActiveAccount`, `createShare`, `revokeShare`.
- `src/lib/shared.functions.ts` — `getSharedAccount`, `getSharedTrades`, `getSharedReviews`, `askSharedCoach` (all admin-scoped + token-validated, no `requireSupabaseAuth`).
- `src/routes/_authenticated/accounts.tsx` — list + create dialog (AI chat) + share manager.
- `src/routes/shared.$token.tsx` — public viewer (own layout, not under `_authenticated`).
- `src/components/AccountSwitcher.tsx` — header dropdown.
- Update `useAccountData.ts` → read active account from profile.
- Update `AppShell.tsx` → mount switcher, add `/accounts` nav.
- Update `coach.functions.ts` → scope to active account.

```text
/accounts                  ← manage accounts + shares (auth)
/shared/{token}            ← public, read-only journal + reviews + AI Q&A
```

Out of scope: editing shared trades, multi-user collab, share expiry dates (just on/off toggle).
