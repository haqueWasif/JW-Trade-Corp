import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Account, Rules, Settings, Trade } from "@/lib/trading";

export function useAccountData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["account-data", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: profile }, { data: accounts }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select("id, active_account_id, display_name, email").eq("id", user!.id).maybeSingle(),
        supabase.from("trading_accounts").select("*").order("created_at"),
        supabase.from("user_settings").select("*").maybeSingle(),
      ]);
      const accountsList = (accounts ?? []) as Account[];
      const activeId = (profile as any)?.active_account_id as string | null;
      const account =
        accountsList.find((a) => a.id === activeId) ?? accountsList[0] ?? null;

      let rules: Rules | null = null;
      if (account) {
        const { data: r } = await supabase
          .from("prop_firm_rules").select("*").eq("account_id", account.id).maybeSingle();
        rules = r as Rules | null;
      }
      return {
        profile,
        accounts: accountsList,
        account,
        rules,
        settings: (settings ?? null) as Settings | null,
      };
    },
  });
}

export function useTrades(accountId?: string) {
  return useQuery({
    queryKey: ["trades", accountId],
    queryFn: async () => {
      let q = supabase.from("trades").select("*").order("date", { ascending: false }).order("time", { ascending: false });
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Trade[];
    },
    enabled: !!accountId,
  });
}
