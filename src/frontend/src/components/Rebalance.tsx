import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import type { Portfolio } from "../backend.d";
import { useCurrency } from "../hooks/useCurrency";
import { useRebalanceSuggestions } from "../hooks/useQueries";

interface RebalanceProps {
  portfolioId: bigint | null;
  portfolio: Portfolio | undefined;
}

function fmt(val: number, decimals = 2) {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function Rebalance({ portfolioId, portfolio }: RebalanceProps) {
  const { fmtCurrency } = useCurrency();
  const suggestionsQuery = useRebalanceSuggestions(portfolioId);
  const suggestions = suggestionsQuery.data ?? [];
  const loading = suggestionsQuery.isLoading;

  const totalTargetPct = useMemo(() => {
    return suggestions.reduce((sum, s) => sum + s.targetAllocationPct, 0);
  }, [suggestions]);

  const totalBuyAmount = useMemo(() => {
    return suggestions
      .filter((s) => s.suggestedAmount > 0)
      .reduce((sum, s) => sum + s.suggestedAmount, 0);
  }, [suggestions]);

  const totalSellAmount = useMemo(() => {
    return suggestions
      .filter((s) => s.suggestedAmount < 0)
      .reduce((sum, s) => sum + Math.abs(s.suggestedAmount), 0);
  }, [suggestions]);

  const isBalanced = totalTargetPct > 99.5 && totalTargetPct < 100.5;

  if (!portfolioId || !portfolio) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">No portfolio selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold font-display text-foreground">
              Rebalance
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {portfolio.name} · Target allocation guidance
            </p>
          </div>
          {!loading && suggestions.length > 0 && (
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border",
                isBalanced
                  ? "border-gain/30 text-gain bg-gain/5"
                  : "border-[oklch(0.78_0.17_85/0.3)] text-[oklch(0.78_0.17_85)] bg-[oklch(0.78_0.17_85/0.05)]",
              )}
            >
              {isBalanced ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Targets balanced
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  Targets off by {fmt(Math.abs(100 - totalTargetPct), 1)}%
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Explanation */}
        <Card className="border-border bg-card">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Scale className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  How Rebalancing Works
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Based on your target allocations, this shows how much to buy
                  or sell each asset to restore your desired portfolio balance.
                  Green actions increase positions, red actions reduce them.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {!loading && suggestions.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total to Buy
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-xl font-bold font-mono tabular text-gain">
                  +{fmtCurrency(totalBuyAmount)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total to Sell
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-xl font-bold font-mono tabular text-loss">
                  -{fmtCurrency(totalSellAmount)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Target Total
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div
                  className={cn(
                    "text-xl font-bold font-mono tabular",
                    isBalanced ? "text-gain" : "text-[oklch(0.78_0.17_85)]",
                  )}
                >
                  {fmt(totalTargetPct, 1)}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Suggestions Table */}
        {loading ? (
          <div className="space-y-2">
            {["r1", "r2", "r3", "r4"].map((k) => (
              <Skeleton key={k} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                <Scale className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">No suggestions</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Add assets with target allocations to see rebalancing
                recommendations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {[
                      "Asset",
                      "Type",
                      "Current Value",
                      "Current %",
                      "Target %",
                      "Difference",
                      "Suggested Action",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((suggestion) => {
                    const isBuy = suggestion.suggestedAmount > 0;
                    const isSell = suggestion.suggestedAmount < 0;
                    const isNeutral = suggestion.suggestedAmount === 0;
                    const diffAbs = Math.abs(suggestion.allocationDiffPct);
                    const isStock =
                      suggestion.asset.assetType.toLowerCase() === "stock";

                    return (
                      <tr
                        key={suggestion.asset.id.toString()}
                        className="border-b border-border/50 hover:bg-accent/20 transition-colors"
                      >
                        {/* Asset */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground tracking-wider">
                              {suggestion.asset.ticker}
                            </span>
                            <span className="text-xs text-muted-foreground hidden md:block max-w-[100px] truncate">
                              {suggestion.asset.name}
                            </span>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs border",
                              isStock
                                ? "border-[oklch(0.68_0.18_200/0.5)] text-[oklch(0.68_0.18_200)] bg-[oklch(0.68_0.18_200/0.08)]"
                                : "border-[oklch(0.68_0.2_25/0.5)] text-[oklch(0.68_0.2_25)] bg-[oklch(0.68_0.2_25/0.08)]",
                            )}
                          >
                            {isStock ? "Stock" : "Crypto"}
                          </Badge>
                        </td>

                        {/* Current Value */}
                        <td className="px-4 py-4 font-mono tabular text-foreground">
                          {fmtCurrency(suggestion.currentValue)}
                        </td>

                        {/* Current % */}
                        <td className="px-4 py-4">
                          <div className="font-mono tabular text-foreground">
                            {fmt(suggestion.currentAllocationPct, 1)}%
                          </div>
                          <div className="w-20 h-1 rounded-full bg-muted mt-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/60"
                              style={{
                                width: `${Math.min(suggestion.currentAllocationPct, 100)}%`,
                              }}
                            />
                          </div>
                        </td>

                        {/* Target % */}
                        <td className="px-4 py-4">
                          <div className="font-mono tabular text-foreground">
                            {fmt(suggestion.targetAllocationPct, 1)}%
                          </div>
                          <div className="w-20 h-1 rounded-full bg-muted mt-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${Math.min(suggestion.targetAllocationPct, 100)}%`,
                              }}
                            />
                          </div>
                        </td>

                        {/* Difference */}
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              "font-mono tabular text-sm",
                              isBuy
                                ? "text-gain"
                                : isSell
                                  ? "text-loss"
                                  : "text-muted-foreground",
                            )}
                          >
                            {isBuy ? "+" : isSell ? "-" : ""}
                            {fmt(diffAbs, 1)}%
                          </span>
                        </td>

                        {/* Suggested Action */}
                        <td className="px-4 py-4">
                          {isNeutral ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Balanced
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "inline-flex items-center gap-1.5 text-sm font-semibold font-mono tabular px-2.5 py-1 rounded-md",
                                isBuy
                                  ? "bg-gain/10 text-gain border border-gain/20"
                                  : "bg-loss/10 text-loss border border-loss/20",
                              )}
                            >
                              {isBuy ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                              ) : (
                                <TrendingDown className="w-3.5 h-3.5" />
                              )}
                              {isBuy ? "Buy " : "Sell "}
                              {fmtCurrency(
                                Math.abs(suggestion.suggestedAmount),
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer */}
                <tfoot>
                  <tr className="border-t border-border bg-muted/20">
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-xs font-medium text-muted-foreground"
                    >
                      Total Target Allocation
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "font-mono tabular font-bold text-sm",
                          isBalanced
                            ? "text-gain"
                            : "text-[oklch(0.78_0.17_85)]",
                        )}
                      >
                        {fmt(totalTargetPct, 1)}%
                      </span>
                      {!isBalanced && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Should sum to 100%
                        </div>
                      )}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
