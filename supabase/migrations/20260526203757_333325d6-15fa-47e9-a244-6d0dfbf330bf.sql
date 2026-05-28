
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "p_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "p_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- TRADING ACCOUNTS
CREATE TABLE public.trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'FundingPips $2,500 Standard',
  prop_firm TEXT NOT NULL DEFAULT 'FundingPips',
  challenge_type TEXT NOT NULL DEFAULT 'Standard 2-Step',
  phase TEXT NOT NULL DEFAULT 'Phase 1',
  account_size NUMERIC NOT NULL DEFAULT 2500,
  starting_balance NUMERIC NOT NULL DEFAULT 2500,
  current_balance NUMERIC NOT NULL DEFAULT 2500,
  current_equity NUMERIC NOT NULL DEFAULT 2500,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_accounts TO authenticated;
GRANT ALL ON public.trading_accounts TO service_role;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ta_all_own" ON public.trading_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PROP FIRM RULES
CREATE TABLE public.prop_firm_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase1_target_pct NUMERIC NOT NULL DEFAULT 8,
  phase2_target_pct NUMERIC NOT NULL DEFAULT 5,
  daily_loss_pct NUMERIC NOT NULL DEFAULT 5,
  max_loss_pct NUMERIC NOT NULL DEFAULT 10,
  min_trading_days INT NOT NULL DEFAULT 3,
  inactivity_days INT NOT NULL DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prop_firm_rules TO authenticated;
GRANT ALL ON public.prop_firm_rules TO service_role;
ALTER TABLE public.prop_firm_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pfr_all_own" ON public.prop_firm_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PERSONAL SETTINGS
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_per_trade_pct NUMERIC NOT NULL DEFAULT 0.5,
  personal_daily_stop_pct NUMERIC NOT NULL DEFAULT 2,
  max_trades_per_day INT NOT NULL DEFAULT 2,
  stop_after_losses INT NOT NULL DEFAULT 2,
  min_rr NUMERIC NOT NULL DEFAULT 2,
  preferred_session TEXT NOT NULL DEFAULT 'NY AM',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  default_pairs TEXT[] NOT NULL DEFAULT ARRAY['EURUSD','GBPUSD','XAUUSD','US30','NAS100'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "us_all_own" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DAILY CHECKLISTS
CREATE TABLE public.daily_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  session TEXT NOT NULL DEFAULT 'NY AM',
  instrument TEXT,
  htf_bias TEXT,
  daily_bias TEXT,
  news_checked BOOLEAN DEFAULT false,
  red_news_avoided BOOLEAN DEFAULT false,
  liquidity_marked BOOLEAN DEFAULT false,
  asia_range_marked BOOLEAN DEFAULT false,
  london_manipulation_checked BOOLEAN DEFAULT false,
  po3_model_present BOOLEAN DEFAULT false,
  accumulation_identified BOOLEAN DEFAULT false,
  manipulation_identified BOOLEAN DEFAULT false,
  distribution_confirmed BOOLEAN DEFAULT false,
  entry_model_valid BOOLEAN DEFAULT false,
  risk_calculated BOOLEAN DEFAULT false,
  max_trades_not_exceeded BOOLEAN DEFAULT true,
  emotional_state TEXT,
  sleep_quality TEXT,
  confidence_level INT,
  plan_notes TEXT,
  trade_allowed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklists_user_date ON public.daily_checklists(user_id, date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_checklists TO authenticated;
GRANT ALL ON public.daily_checklists TO service_role;
ALTER TABLE public.daily_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dc_all_own" ON public.daily_checklists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TRADES
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME,
  session TEXT,
  instrument TEXT NOT NULL,
  direction TEXT NOT NULL,
  setup_type TEXT,
  po3_phase TEXT,
  htf_bias TEXT,
  entry_reason TEXT,
  entry_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  position_size NUMERIC,
  risk_pct NUMERIC,
  risk_amount NUMERIC,
  reward_amount NUMERIC,
  planned_rr NUMERIC,
  exit_price NUMERIC,
  pnl NUMERIC DEFAULT 0,
  r_multiple NUMERIC,
  outcome TEXT,
  screenshot_before TEXT,
  screenshot_after TEXT,
  emotion_before TEXT,
  emotion_during TEXT,
  emotion_after TEXT,
  mistakes TEXT,
  rule_broken BOOLEAN DEFAULT false,
  which_rule TEXT,
  lesson TEXT,
  grade TEXT,
  followed_plan BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trades_user_date ON public.trades(user_id, date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tr_all_own" ON public.trades FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DAILY REVIEWS
CREATE TABLE public.daily_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  followed_plan BOOLEAN,
  followed_po3 BOOLEAN,
  ny_only BOOLEAN,
  respected_max_trades BOOLEAN,
  respected_risk BOOLEAN,
  biggest_mistake TEXT,
  best_decision TEXT,
  lesson_tomorrow TEXT,
  discipline_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_user_date ON public.daily_reviews(user_id, date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_reviews TO authenticated;
GRANT ALL ON public.daily_reviews TO service_role;
ALTER TABLE public.daily_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_all_own" ON public.daily_reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AUTO-CREATE profile + default account + rules + settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));

  INSERT INTO public.trading_accounts (user_id) VALUES (NEW.id) RETURNING id INTO new_account_id;

  INSERT INTO public.prop_firm_rules (account_id, user_id) VALUES (new_account_id, NEW.id);
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER t_profiles_uat BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_ta_uat BEFORE UPDATE ON public.trading_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_pfr_uat BEFORE UPDATE ON public.prop_firm_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_us_uat BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_dc_uat BEFORE UPDATE ON public.daily_checklists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_tr_uat BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_dr_uat BEFORE UPDATE ON public.daily_reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
