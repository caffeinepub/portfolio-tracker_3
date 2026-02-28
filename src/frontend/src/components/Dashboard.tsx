import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Portfolio } from "../backend.d";
import { usePortfolioSummary } from "../hooks/useQueries";

interface DashboardProps {
  portfolioId: bigint | null;
  portfolio: Portfolio | undefined;
}

const CHART_COLORS = [
  "oklch(0.72 0.16 185)",
  "oklch(0.68 0.18 200)",
  "oklch(0.78 0.17 85)",
  "oklch(0.65 0.2 300)",
  "oklch(0.68 0.2 25)",
  "oklch(0.66 0.19 145)",
  "oklch(0.7 0.16 55)",
  "oklch(0.6 0.15 260)",
];

function fmt(val: number, decimals = 2) {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(val: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function SummaryCard({
  title,
  value,
  subValue,
  icon: Icon,
  isGainLoss,
  loading,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  isGainLoss?: boolean;
  loading: boolean;
}) {
  const isPositive = subValue ? Number.parseFloat(subValue) >= 0 : true;
  const isNegative = subValue ? Number.parseFloat(subValue) < 0 : false;

  return (
    <Card className="relative overflow-hidden border-border bg-card">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <CardHeader className="pb-2 relative">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          {title}
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {loading ? (
          <>
            <Skeleton className="h-7 w-32 mb-1" />
            <Skeleton className="h-4 w-20" />
          </>
        ) : (
          <>
            <div
              className={cn(
                "text-2xl font-bold font-mono tabular",
                isGainLoss && isPositive && "text-gain",
                isGainLoss && isNegative && "text-loss",
              )}
            >
              {value}
            </div>
            {subValue !== undefined && (
              <div
                className={cn(
                  "text-xs mt-0.5 font-mono tabular flex items-center gap-1",
                  isPositive ? "text-gain" : "text-loss",
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {subValue}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { pct: number } }>;
}) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-xl">
        <div className="font-medium text-foreground">{entry.name}</div>
        <div className="text-muted-foreground font-mono tabular">
          {fmtCurrency(entry.value)}
        </div>
        <div className="text-primary font-mono tabular text-xs">
          {fmt(entry.payload.pct, 1)}%
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard({ portfolioId, portfolio }: DashboardProps) {
  const summaryQuery = usePortfolioSummary(portfolioId);
  const summary = summaryQuery.data;
  const loading = summaryQuery.isLoading;

  // Allocation chart data
  const allocationData = useMemo(() => {
    if (!summary?.assets) return [];
    return summary.assets.map((ab) => ({
      name: ab.asset.ticker,
      fullName: ab.asset.name,
      value: ab.value,
      pct: ab.actualAllocationPct,
    }));
  }, [summary]);

  // Stock vs Crypto split
  const assetTypeSplit = useMemo(() => {
    if (!summary?.assets) return [];
    const byType: Record<string, number> = {};
    for (const ab of summary.assets) {
      const t = ab.asset.assetType;
      byType[t] = (byType[t] ?? 0) + ab.value;
    }
    return Object.entries(byType).map(([type, value]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value,
      pct:
        summary.totalMarketValue > 0
          ? (value / summary.totalMarketValue) * 100
          : 0,
    }));
  }, [summary]);

  const isNoPortfolio = !portfolioId || !portfolio;

  if (isNoPortfolio) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No Portfolio Selected</h2>
          <p className="text-sm text-muted-foreground">
            Create a portfolio from the sidebar to get started tracking your
            investments.
          </p>
        </div>
      </div>
    );
  }

  const hasAssets = (summary?.assets?.length ?? 0) > 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold font-display text-foreground">
              {portfolio.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Portfolio Overview
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-xs border-primary/30 text-primary bg-primary/5"
          >
            Live
          </Badge>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Value"
            value={loading ? "—" : fmtCurrency(summary?.totalMarketValue ?? 0)}
            icon={DollarSign}
            loading={loading}
          />
          <SummaryCard
            title="Cost Basis"
            value={loading ? "—" : fmtCurrency(summary?.totalCostBasis ?? 0)}
            icon={BarChart3}
            loading={loading}
          />
          <SummaryCard
            title="Total Gain/Loss"
            value={loading ? "—" : fmtCurrency(summary?.totalGainLoss ?? 0)}
            subValue={
              loading
                ? undefined
                : `${(summary?.totalGainLoss ?? 0) >= 0 ? "+" : ""}${fmt(summary?.totalGainLoss ?? 0, 2)}`
            }
            icon={
              summary?.totalGainLoss && summary.totalGainLoss >= 0
                ? TrendingUp
                : TrendingDown
            }
            isGainLoss
            loading={loading}
          />
          <SummaryCard
            title="Return"
            value={
              loading
                ? "—"
                : `${(summary?.totalGainLossPct ?? 0) >= 0 ? "+" : ""}${fmt(summary?.totalGainLossPct ?? 0, 2)}%`
            }
            icon={
              summary?.totalGainLossPct && summary.totalGainLossPct >= 0
                ? TrendingUp
                : TrendingDown
            }
            isGainLoss
            loading={loading}
          />
        </div>

        {/* Charts Row */}
        {!loading && !hasAssets ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">No assets yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Switch to Holdings and add your first asset to see allocation
                charts.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Allocation Donut Chart */}
            <Card className="col-span-2 border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Asset Allocation
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Current portfolio composition
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <Skeleton className="w-48 h-48 rounded-full" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                      >
                        {allocationData.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        formatter={(value) => (
                          <span className="text-xs text-foreground">
                            {value}
                          </span>
                        )}
                        iconType="circle"
                        iconSize={8}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Asset Type Breakdown */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Asset Class Split
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Stocks vs Crypto
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3 mt-4">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                ) : assetTypeSplit.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                    No data
                  </div>
                ) : (
                  <div className="space-y-3 mt-2">
                    {assetTypeSplit.map((item, i) => {
                      const isStock = item.name.toLowerCase() === "stock";
                      return (
                        <div
                          key={item.name}
                          className="rounded-lg border border-border p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  isStock
                                    ? "bg-[oklch(0.68_0.18_200)]"
                                    : "bg-[oklch(0.68_0.2_25)]",
                                )}
                              />
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs border",
                                  isStock
                                    ? "border-[oklch(0.68_0.18_200/0.4)] text-[oklch(0.68_0.18_200)] bg-[oklch(0.68_0.18_200/0.08)]"
                                    : "border-[oklch(0.68_0.2_25/0.4)] text-[oklch(0.68_0.2_25)] bg-[oklch(0.68_0.2_25/0.08)]",
                                )}
                              >
                                {item.name}
                              </Badge>
                            </div>
                            <span className="text-xs font-mono tabular text-muted-foreground">
                              {fmt(item.pct, 1)}%
                            </span>
                          </div>
                          <div className="text-lg font-bold font-mono tabular">
                            {fmtCurrency(item.value)}
                          </div>
                          {/* Progress bar */}
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(item.pct, 100)}%`,
                                background:
                                  CHART_COLORS[i % CHART_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Top holdings list */}
                    <div className="pt-2 border-t border-border">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Top Holdings
                      </div>
                      {(summary?.assets ?? [])
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 4)
                        .map((ab) => (
                          <div
                            key={ab.asset.id.toString()}
                            className="flex items-center justify-between py-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-foreground w-12 truncate">
                                {ab.asset.ticker}
                              </span>
                              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                                {ab.asset.name}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "text-xs font-mono tabular",
                                ab.gainLoss >= 0 ? "text-gain" : "text-loss",
                              )}
                            >
                              {ab.gainLoss >= 0 ? "+" : ""}
                              {fmt(ab.gainLossPct, 1)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Asset Breakdown Table */}
        {!loading && hasAssets && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">
                Holdings Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Asset
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Value
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Gain/Loss
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Alloc %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary?.assets
                      .sort((a, b) => b.value - a.value)
                      .map((ab) => (
                        <tr
                          key={ab.asset.id.toString()}
                          className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-foreground">
                                {ab.asset.ticker}
                              </span>
                              <span className="text-xs text-muted-foreground hidden sm:block">
                                {ab.asset.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular text-foreground">
                            {fmtCurrency(ab.value)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular text-muted-foreground">
                            {fmtCurrency(ab.cost)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div
                              className={cn(
                                "font-mono tabular text-sm",
                                ab.gainLoss >= 0 ? "text-gain" : "text-loss",
                              )}
                            >
                              {ab.gainLoss >= 0 ? "+" : ""}
                              {fmtCurrency(ab.gainLoss)}
                            </div>
                            <div
                              className={cn(
                                "font-mono tabular text-xs",
                                ab.gainLoss >= 0 ? "text-gain" : "text-loss",
                              )}
                            >
                              {ab.gainLoss >= 0 ? "+" : ""}
                              {fmt(ab.gainLossPct, 2)}%
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular text-muted-foreground">
                            {fmt(ab.actualAllocationPct, 1)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
