import { useAccountData } from "@/hooks/useAccountData";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { setActiveAccount } from "@/lib/accounts.functions";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

export function AccountSwitcher() {
  const { data } = useAccountData();
  const setActive = useServerFn(setActiveAccount);
  const qc = useQueryClient();
  const accounts = data?.accounts ?? [];
  const active = data?.account;

  async function pick(id: string) {
    try {
      await setActive({ data: { accountId: id } });
      qc.invalidateQueries();
      toast.success("Account switched");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to switch");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2 truncate">
            <Wallet className="size-3.5 text-primary" />
            <span className="truncate">{active?.name ?? "No account"}</span>
          </span>
          <ChevronsUpDown className="size-3.5 opacity-50 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Accounts
        </DropdownMenuLabel>
        {accounts.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground">No accounts yet.</div>
        )}
        {accounts.map((a) => (
          <DropdownMenuItem key={a.id} onClick={() => pick(a.id)} className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm truncate">{a.name}</div>
              <div className="text-[10px] font-mono text-muted-foreground truncate">{a.prop_firm} · {a.phase}</div>
            </div>
            {active?.id === a.id && <Check className="size-3.5 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/accounts" className="flex items-center gap-2">
            <Plus className="size-3.5" /> Manage accounts
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
