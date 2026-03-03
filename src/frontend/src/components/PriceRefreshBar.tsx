import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Wifi } from "lucide-react";
import { toast } from "sonner";
import type { Asset } from "../backend.d";
import { useRefreshPrices } from "../hooks/useQueries";

interface PriceRefreshBarProps {
  portfolioId: bigint | null;
  assets: Asset[];
  className?: string;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function PriceRefreshBar({
  portfolioId,
  assets,
  className,
}: PriceRefreshBarProps) {
  const { refresh, isRefreshing, lastRefreshed } = useRefreshPrices();

  const handleRefresh = async () => {
    if (!portfolioId || assets.length === 0 || isRefreshing) return;
    try {
      const result = await refresh({ portfolioId, assets });
      if (result.updatedCount > 0) {
        toast.success(
          `Updated ${result.updatedCount} price${result.updatedCount !== 1 ? "s" : ""}`,
        );
      } else {
        toast.info("No prices updated — check tickers or API key");
      }
    } catch {
      toast.error("Price refresh failed");
    }
  };

  const hasCrypto = assets.some((a) => a.assetType.toLowerCase() === "crypto");
  const hasExchange = assets.some((a) => {
    const t = a.assetType.toLowerCase();
    return t === "stock" || t === "etf" || t === "fixed_income";
  });

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm",
        className,
      )}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex items-center">
          <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
              isRefreshing
                ? "bg-amber-500 animate-pulse"
                : lastRefreshed
                  ? "bg-emerald-500"
                  : "bg-muted-foreground/40",
            )}
          />
        </div>
        <span className="text-xs font-medium text-foreground">Live Prices</span>
      </div>

      {/* Data sources */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {hasCrypto && (
          <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full whitespace-nowrap">
            Crypto: CoinGecko (free)
          </span>
        )}
        {hasExchange && (
          <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full whitespace-nowrap">
            Stocks / ETFs: Yahoo Finance
          </span>
        )}
      </div>

      {/* Last updated timestamp */}
      <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
        {isRefreshing
          ? "Refreshing…"
          : lastRefreshed
            ? `Updated ${timeAgo(lastRefreshed)}`
            : "Never updated"}
      </span>

      {/* Refresh button */}
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2.5 text-xs gap-1.5 shrink-0 border-border hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
        onClick={handleRefresh}
        disabled={isRefreshing || !portfolioId || assets.length === 0}
      >
        {isRefreshing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <RefreshCw className="w-3 h-3" />
        )}
        {isRefreshing ? "Refreshing" : "Refresh Prices"}
      </Button>
    </div>
  );
}
