import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Activity,
  ChevronDown,
  LayoutDashboard,
  LineChart,
  LogOut,
  Plus,
  Scale,
  Settings,
  Sliders,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { ActiveView } from "../App";
import type { Portfolio } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  portfolios: Portfolio[];
  selectedPortfolio: Portfolio | undefined;
  onSelectPortfolio: (id: bigint) => void;
  onCreatePortfolio: (name: string) => void;
  onDeletePortfolio: (id: bigint) => void;
  isCreating: boolean;
  isDeleting: boolean;
  isLoading: boolean;
}

const navItems: {
  id: ActiveView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "holdings", label: "Holdings", icon: LineChart },
  { id: "rebalance", label: "Rebalance", icon: Scale },
  { id: "optimizer", label: "Optimizer", icon: Sliders },
  { id: "analytics", label: "Analytics", icon: Activity },
];

const bottomNavItems: {
  id: ActiveView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [{ id: "settings", label: "Settings", icon: Settings }];

export default function Sidebar({
  activeView,
  onNavigate,
  portfolios,
  selectedPortfolio,
  onSelectPortfolio,
  onCreatePortfolio,
  onDeletePortfolio,
  isCreating,
  isDeleting,
  isLoading,
}: SidebarProps) {
  const { clear, identity } = useInternetIdentity();
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [nameError, setNameError] = useState("");

  const handleCreate = () => {
    if (!newPortfolioName.trim()) {
      setNameError("Portfolio name is required");
      return;
    }
    onCreatePortfolio(newPortfolioName.trim());
    setNewPortfolioName("");
    setNameError("");
    setShowCreate(false);
  };

  const handleDeleteConfirm = () => {
    if (selectedPortfolio) {
      onDeletePortfolio(selectedPortfolio.id);
      setShowDelete(false);
    }
  };

  return (
    <>
      <aside className="w-60 flex flex-col border-r border-border bg-sidebar shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-foreground font-display">
                PortfolioOS
              </div>
              <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Asset Manager
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Switcher */}
        <div className="px-3 py-3 border-b border-border">
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground px-2 mb-2">
            Portfolio
          </div>
          {isLoading ? (
            <Skeleton className="h-9 w-full rounded-md" />
          ) : portfolios.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              No portfolios yet
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-9 text-sm font-medium bg-accent/50 border-border hover:bg-accent"
                >
                  <span className="truncate max-w-[120px]">
                    {selectedPortfolio?.name ?? "Select portfolio"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-1 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {portfolios.map((p) => (
                  <DropdownMenuItem
                    key={p.id.toString()}
                    onSelect={() => onSelectPortfolio(p.id)}
                    className={cn(
                      "cursor-pointer",
                      p.id === selectedPortfolio?.id &&
                        "bg-primary/10 text-primary",
                    )}
                  >
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex gap-1.5 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-3 h-3" />
              New
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-border"
              onClick={() => setShowDelete(true)}
              disabled={!selectedPortfolio || isDeleting}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-3 flex-1">
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground px-2 mb-2">
            Views
          </div>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150",
                      isActive
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        isActive ? "text-primary" : "",
                      )}
                    />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto w-1 h-4 rounded-full bg-primary" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Nav (Settings, etc.) */}
        <div className="px-3 pb-1 border-t border-border pt-2">
          <ul className="space-y-0.5">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150",
                      isActive
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        isActive ? "text-primary" : "",
                      )}
                    />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto w-1 h-4 rounded-full bg-primary" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border space-y-2">
          {identity && (
            <button
              type="button"
              onClick={clear}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150 group"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0 group-hover:text-destructive" />
              <span className="truncate">
                {identity.getPrincipal().toString().slice(0, 12)}…
              </span>
              <span className="ml-auto opacity-0 group-hover:opacity-100 text-[10px] font-medium transition-opacity">
                Sign Out
              </span>
            </button>
          )}
          <p className="text-[10px] text-muted-foreground px-1">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors"
            >
              Built with caffeine.ai
            </a>
          </p>
        </div>
      </aside>

      {/* Create Portfolio Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Portfolio</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="portfolio-name" className="text-sm mb-1.5 block">
              Portfolio Name
            </Label>
            <Input
              id="portfolio-name"
              placeholder="e.g. Growth Portfolio"
              value={newPortfolioName}
              onChange={(e) => {
                setNewPortfolioName(e.target.value);
                setNameError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              autoFocus
            />
            {nameError && (
              <p className="text-xs text-destructive mt-1.5">{nameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setNewPortfolioName("");
                setNameError("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Portfolio Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portfolio?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {selectedPortfolio?.name}
              </span>{" "}
              and all its assets. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Portfolio"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
