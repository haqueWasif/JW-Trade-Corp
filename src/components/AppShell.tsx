import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import jwLogo from "@/assets/jw-logo.png";
import {
  LayoutDashboard, ClipboardCheck, BookOpen, Calculator,
  ShieldAlert, BarChart3, CalendarDays, Settings, Sparkles, LogOut, Upload, NotebookPen, Wallet, Library, Target, Menu,
} from "lucide-react";


const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/checklist", label: "Pre-Session Checklist", icon: ClipboardCheck },
  { to: "/journal", label: "Trade Journal", icon: BookOpen },
  { to: "/review", label: "Daily Review", icon: NotebookPen },
  { to: "/playbook", label: "Strategy Playbook", icon: Library },
  { to: "/risk", label: "Risk Calculator", icon: Calculator },
  { to: "/rules", label: "Rules & Compliance", icon: ShieldAlert },
  { to: "/analytics", label: "Review & Analytics", icon: BarChart3 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/pre-trade", label: "Pre-Trade Analysis", icon: Target },
  { to: "/coach", label: "AI Coach Chat", icon: Sparkles },
  { to: "/import", label: "Import", icon: Upload },
  { to: "/settings", label: "Settings", icon: Settings },
];

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <div className="size-10 rounded bg-background border border-primary/40 grid place-items-center overflow-hidden glow-primary">
            <img src={jwLogo} alt="JW Trade Corp" className="size-full object-contain" />
          </div>
          <div>
            <div className="font-display font-bold text-sm tracking-tight">JW TRADE</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Jahir & Wasif Trade Corp</div>
          </div>
        </Link>
      </div>
      <div className="p-3 border-b border-border">
        <AccountSwitcher />
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {nav.map((n) => {
          const active = pathname.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active ? "bg-primary/15 text-foreground border border-primary/30" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="text-xs text-muted-foreground mb-2 truncate font-mono">{user?.email}</div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={async () => { await signOut(); router.navigate({ to: "/login" }); }}
        >
          <LogOut className="size-3.5 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-card/60 backdrop-blur sticky top-0 h-screen flex-col">
        <SidebarBody />
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-3 h-14 border-b border-border bg-card/80 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="size-9">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded bg-background border border-primary/40 grid place-items-center overflow-hidden">
              <img src={jwLogo} alt="JW" className="size-full object-contain" />
            </div>
            <div className="font-display font-bold text-sm tracking-tight truncate">JW TRADE</div>
          </Link>
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
  );
}
