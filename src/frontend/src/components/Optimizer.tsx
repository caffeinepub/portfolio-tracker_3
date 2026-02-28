import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Minus,
  Sliders,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Portfolio } from "../backend.d";
import {
  useProfileRebalanceSuggestions,
  useUpdateAsset,
} from "../hooks/useQueries";

interface OptimizerProps {
  portfolioId: bigint | null;
  portfolio: Portfolio | undefined;
}

type MarketCondition = "bull" | "bear";
type RiskProfile = "aggressive" | "balanced" | "conservative";

const COMBOS: Record<
  `${RiskProfile}-${MarketCondition}`,
  { title: string; description: string; icon: React.ReactNode; color: string }
> = {
  "aggressive-bull": {
    title: "Maximize Growth",
    description:
      "Increase crypto and high-beta equity exposure. Minimize cash drag. Ride momentum across growth sectors.",
    icon: <Zap className="w-4 h-4" />,
    color: "text-[oklch(0.75_0.2_85)]",
  },
  "aggressive-bear": {
    title: "Capital Preservation — Aggressive",
    description:
      "Reduce high-volatility assets sharply. Rotate out of speculative positions. Protect downside while keeping some upside.",
    icon: <AlertCircle className="w-4 h-4" />,
    color: "text-[oklch(0.68_0.2_25)]",
  },
  "balanced-bull": {
    title: "Moderate Growth with Diversification",
    description:
      "Moderate equity tilt with broad sector diversification. Mix growth and value. Keep some fixed income as a buffer.",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "text-[oklch(0.72_0.16_185)]",
  },
  "balanced-bear": {
    title: "Stability-First Repositioning",
    description:
      "Shift from growth to stability. Reduce tech and crypto positions. Rotate toward consumer staples and utilities.",
    icon: <Minus className="w-4 h-4" />,
    color: "text-[oklch(0.68_0.18_200)]",
  },
  "conservative-bull": {
    title: "Dividend-Led, Low Speculation",
    description:
      "Focus on dividend stocks and low-beta assets. Minimal speculation. Let steady income compound while markets rise.",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-[oklch(0.72_0.18_160)]",
  },
  "conservative-bear": {
    title: "Maximum Defensive Positioning",
    description:
      "Near-zero crypto allocation. Favor dividend stocks, bonds, and utilities. Preserve capital above all else.",
    icon: <TrendingDown className="w-4 h-4" />,
    color: "text-[oklch(0.62_0.22_25)]",
  },
};

function fmt(val: number, decimals = 2) {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function Optimizer({ portfolioId, portfolio }: OptimizerProps) {
  const [marketCondition, setMarketCondition] =
    useState<MarketCondition>("bull");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");

  const suggestionsQuery = useProfileRebalanceSuggestions(
    portfolioId,
    marketCondition,
    riskProfile,
  );
  const suggestions = suggestionsQuery.data ?? [];
  const loading = suggestionsQuery.isLoading;

  const updateAsset = useUpdateAsset();
  const [isApplying, setIsApplying] = useState(false);

  const comboKey = `${riskProfile}-${marketCondition}` as const;
  const combo = COMBOS[comboKey];

  const handleApply = async () => {
    if (!portfolioId || suggestions.length === 0) return;
    setIsApplying(true);
    try {
      await Promise.all(
        suggestions.map((s) =>
          updateAsset.mutateAsync({
            ...s.asset,
            targetAllocationPct: s.suggestedTargetPct,
          }),
        ),
      );
      toast.success(
        `Applied ${riskProfile} + ${marketCondition} market targets to ${suggestions.length} assets`,
      );
    } catch {
      toast.error("Failed to apply suggestions");
    } finally {
      setIsApplying(false);
    }
  };

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
            <h1 className="text-lg font-semibold font-display text-foreground flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              Market Optimizer
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {portfolio.name} · AI-assisted allocation strategy
            </p>
          </div>
          {suggestions.length > 0 && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleApply}
              disabled={isApplying || loading}
            >
              {isApplying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {isApplying ? "Applying..." : "Apply Suggestions"}
            </Button>
          )}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Market Condition Toggle */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
              Market Condition
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMarketCondition("bull")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border text-sm font-semibold transition-all duration-200",
                  marketCondition === "bull"
                    ? "bg-[oklch(0.72_0.18_160/0.15)] border-[oklch(0.72_0.18_160/0.4)] text-[oklch(0.72_0.18_160)] shadow-[0_0_16px_oklch(0.72_0.18_160/0.1)]"
                    : "bg-card border-border text-muted-foreground hover:border-[oklch(0.72_0.18_160/0.3)] hover:text-[oklch(0.72_0.18_160/0.7)]",
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Bull Market
              </button>
              <button
                type="button"
                onClick={() => setMarketCondition("bear")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border text-sm font-semibold transition-all duration-200",
                  marketCondition === "bear"
                    ? "bg-[oklch(0.62_0.22_25/0.15)] border-[oklch(0.62_0.22_25/0.4)] text-[oklch(0.68_0.2_25)] shadow-[0_0_16px_oklch(0.62_0.22_25/0.1)]"
                    : "bg-card border-border text-muted-foreground hover:border-[oklch(0.62_0.22_25/0.3)] hover:text-[oklch(0.68_0.2_25/0.7)]",
                )}
              >
                <TrendingDown className="w-4 h-4" />
                Bear Market
              </button>
            </div>
          </div>

          {/* Risk Profile Selector */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
              Risk Profile
            </p>
            <div className="flex gap-2">
              {(["aggressive", "balanced", "conservative"] as const).map(
                (profile) => {
                  const styles: Record<
                    RiskProfile,
                    { active: string; hover: string }
                  > = {
                    aggressive: {
                      active:
                        "bg-[oklch(0.78_0.17_85/0.15)] border-[oklch(0.78_0.17_85/0.4)] text-[oklch(0.78_0.17_85)]",
                      hover:
                        "hover:border-[oklch(0.78_0.17_85/0.3)] hover:text-[oklch(0.78_0.17_85/0.7)]",
                    },
                    balanced: {
                      active:
                        "bg-[oklch(0.72_0.16_185/0.15)] border-[oklch(0.72_0.16_185/0.4)] text-[oklch(0.72_0.16_185)]",
                      hover:
                        "hover:border-[oklch(0.72_0.16_185/0.3)] hover:text-[oklch(0.72_0.16_185/0.7)]",
                    },
                    conservative: {
                      active:
                        "bg-[oklch(0.68_0.18_240/0.15)] border-[oklch(0.68_0.18_240/0.4)] text-[oklch(0.68_0.18_240)]",
                      hover:
                        "hover:border-[oklch(0.68_0.18_240/0.3)] hover:text-[oklch(0.68_0.18_240/0.7)]",
                    },
                  };

                  const s = styles[profile];
                  const isActive = riskProfile === profile;

                  return (
                    <button
                      type="button"
                      key={profile}
                      onClick={() => setRiskProfile(profile)}
                      className={cn(
                        "flex-1 py-3 px-3 rounded-lg border text-sm font-semibold capitalize transition-all duration-200",
                        isActive
                          ? s.active
                          : `bg-card border-border text-muted-foreground ${s.hover}`,
                      )}
                    >
                      {profile}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>

        {/* Combo Explainer Card */}
        <Card className="border-border bg-card overflow-hidden">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-muted/30",
                  combo.color,
                )}
              >
                {combo.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className={cn("text-sm font-semibold", combo.color)}>
                    {combo.title}
                  </h3>
                  <div className="flex gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0",
                        marketCondition === "bull"
                          ? "border-[oklch(0.72_0.18_160/0.4)] text-[oklch(0.72_0.18_160)]"
                          : "border-[oklch(0.62_0.22_25/0.4)] text-[oklch(0.68_0.2_25)]",
                      )}
                    >
                      {marketCondition === "bull" ? "↑ Bull" : "↓ Bear"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0 border-border text-muted-foreground"
                    >
                      {riskProfile}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {combo.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Suggested Allocations
            </p>
            {!loading && suggestions.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {suggestions.length} asset{suggestions.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {["r1", "r2", "r3", "r4", "r5"].map((k) => (
                <Skeleton key={k} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-14">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <Sliders className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold mb-1">
                  No suggestions available
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Add assets with target allocations to receive optimizer
                  recommendations for your selected market condition and risk
                  profile.
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
                        "Current Target %",
                        "Suggested %",
                        "Change",
                        "Rationale",
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
                      const change =
                        suggestion.suggestedTargetPct -
                        suggestion.asset.targetAllocationPct;
                      const isIncrease = change > 0.05;
                      const isDecrease = change < -0.05;
                      const isNeutral = !isIncrease && !isDecrease;
                      const isStock =
                        suggestion.asset.assetType.toLowerCase() === "stock";

                      return (
                        <tr
                          key={suggestion.asset.id.toString()}
                          className="border-b border-border/50 hover:bg-accent/20 transition-colors"
                        >
                          {/* Asset */}
                          <td className="px-4 py-4">
                            <div>
                              <span className="font-mono font-bold text-foreground tracking-wider">
                                {suggestion.asset.ticker}
                              </span>
                              <div className="text-xs text-muted-foreground mt-0.5 max-w-[120px] truncate">
                                {suggestion.asset.name}
                              </div>
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

                          {/* Current Target % */}
                          <td className="px-4 py-4">
                            <div className="font-mono tabular text-foreground">
                              {fmt(suggestion.asset.targetAllocationPct, 1)}%
                            </div>
                            <div className="w-20 h-1 rounded-full bg-muted mt-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/50"
                                style={{
                                  width: `${Math.min(suggestion.asset.targetAllocationPct, 100)}%`,
                                }}
                              />
                            </div>
                          </td>

                          {/* Suggested % */}
                          <td className="px-4 py-4">
                            <div
                              className={cn(
                                "font-mono tabular font-semibold",
                                isIncrease
                                  ? "text-gain"
                                  : isDecrease
                                    ? "text-loss"
                                    : "text-foreground",
                              )}
                            >
                              {fmt(suggestion.suggestedTargetPct, 1)}%
                            </div>
                            <div className="w-20 h-1 rounded-full bg-muted mt-1.5 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  isIncrease
                                    ? "bg-gain"
                                    : isDecrease
                                      ? "bg-loss"
                                      : "bg-primary",
                                )}
                                style={{
                                  width: `${Math.min(suggestion.suggestedTargetPct, 100)}%`,
                                }}
                              />
                            </div>
                          </td>

                          {/* Change */}
                          <td className="px-4 py-4">
                            {isNeutral ? (
                              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                <Minus className="w-3.5 h-3.5" />
                                No change
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1 text-sm font-semibold font-mono tabular px-2 py-1 rounded-md",
                                  isIncrease
                                    ? "bg-gain/10 text-gain border border-gain/20"
                                    : "bg-loss/10 text-loss border border-loss/20",
                                )}
                              >
                                {isIncrease ? (
                                  <ArrowUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5" />
                                )}
                                {isIncrease ? "+" : ""}
                                {fmt(change, 1)}%
                              </div>
                            )}
                          </td>

                          {/* Rationale */}
                          <td className="px-4 py-4 max-w-[220px]">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {suggestion.rationale}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Footer summary */}
                  <tfoot>
                    <tr className="border-t border-border bg-muted/20">
                      <td
                        colSpan={3}
                        className="px-4 py-3 text-xs text-muted-foreground font-medium"
                      >
                        Suggested Total Allocation
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const total = suggestions.reduce(
                            (sum, s) => sum + s.suggestedTargetPct,
                            0,
                          );
                          const isOk = total > 99.5 && total < 100.5;
                          return (
                            <span
                              className={cn(
                                "font-mono tabular font-bold text-sm",
                                isOk
                                  ? "text-gain"
                                  : "text-[oklch(0.78_0.17_85)]",
                              )}
                            >
                              {fmt(total, 1)}%
                            </span>
                          );
                        })()}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Apply CTA — bottom */}
        {!loading && suggestions.length > 0 && (
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Applying will update target allocations for all{" "}
              {suggestions.length} assets in this portfolio.
            </p>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleApply}
              disabled={isApplying}
            >
              {isApplying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {isApplying ? "Applying..." : "Apply Suggestions"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
