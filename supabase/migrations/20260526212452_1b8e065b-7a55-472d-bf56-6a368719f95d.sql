
-- 1. profiles.active_account_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_account_id UUID;

-- 2. extra rule columns
ALTER TABLE public.prop_firm_rules
  ADD COLUMN IF NOT EXISTS phase1_max_days INTEGER,
  ADD COLUMN IF NOT EXISTS phase2_max_days INTEGER,
  ADD COLUMN IF NOT EXISTS profit_split_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS weekend_holding_allowed BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS news_trading_allowed BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS consistency_rule_pct NUMERIC;

-- 3. drop auto-seed of default account
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- 4. account_shares
CREATE TABLE IF NOT EXISTS public.account_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  user_id UUID NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_shares TO authenticated;
GRANT ALL ON public.account_shares TO service_role;

ALTER TABLE public.account_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shares_owner_all" ON public.account_shares
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER touch_account_shares
  BEFORE UPDATE ON public.account_shares
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. lookup fn for public viewers (uses service-role inside server fn anyway,
-- but keep this in case we ever want anon to call it directly)
CREATE OR REPLACE FUNCTION public.get_share_by_token(_token TEXT)
RETURNS TABLE (account_id UUID, user_id UUID, is_active BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id, user_id, is_active
  FROM public.account_shares
  WHERE share_token = _token AND is_active = TRUE
  LIMIT 1;
$$;
