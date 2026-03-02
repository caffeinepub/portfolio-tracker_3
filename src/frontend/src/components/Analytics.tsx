import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Portfolio } from "../backend.d";
import { useCurrency } from "../hooks/useCurrency";
import { useAssets, usePortfolioSummary } from "../hooks/useQueries";

interface AnalyticsProps {
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

const GAIN_COLOR = "oklch(0.72 0.16 145)";
const LOSS_COLOR = "oklch(0.65 0.2 25)";
const GRID_STROKE = "oklch(0.28 0.015 240 / 0.5)";
const AXIS_TICK = { fill: "oklch(0.55 0.015 240)", fontSize: 11 };

function fmt(v: number, d = 2) {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

// Metric card with big mono value
function MetricCard({
  label,
  value,
  subtext,
  tone,
  loading,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: "good" | "bad" | "warn" | "neutral";
  loading: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const valueClass =
    tone === "good"
      ? "text-gain"
      : tone === "bad"
        ? "text-loss"
        : tone === "warn"
          ? "text-amber-400"
          : "text-foreground";

  return (
    <Card className="border-border bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <CardHeader className="pb-1 relative">
        <CardTitle className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          {label}
          {Icon && (
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
              <Icon className="w-3 h-3 text-primary" />
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative pt-0">
        {loading ? (
          <>
            <Skeleton className="h-8 w-28 mb-1" />
            <Skeleton className="h-3.5 w-20" />
          </>
        ) : (
          <>
            <div
              className={cn("text-2xl font-bold font-mono tabular", valueClass)}
            >
              {value}
            </div>
            {subtext && (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {subtext}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Factor card — qualitative badge + value
function FactorCard({
  label,
  value,
  rating,
  description,
  loading,
}: {
  label: string;
  value: string;
  rating: "High" | "Moderate" | "Low";
  description: string;
  loading: boolean;
}) {
  const ratingColor =
    rating === "High"
      ? "text-gain bg-gain/10 border-gain/30"
      : rating === "Moderate"
        ? "text-amber-400 bg-amber-400/10 border-amber-400/30"
        : "text-loss bg-loss/10 border-loss/30";

  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-4 pb-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {label}
            </div>
            <div className="flex items-end gap-2">
              <div className="text-xl font-bold font-mono tabular text-foreground">
                {value}
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded border mb-0.5",
                  ratingColor,
                )}
              >
                {rating}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              {description}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Portfolio Charts tooltip components ───────────────────────────────────────

const AllocationTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; value: number; pct: number };
  }>;
}) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
        <div className="font-semibold text-foreground">{d.name}</div>
        <div className="text-muted-foreground text-xs mt-0.5">
          <span className="text-primary font-mono">{fmt(d.pct, 1)}%</span> of
          portfolio
        </div>
      </div>
    );
  }
  return null;
};

const GainLossTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { ticker: string; gainLossPct: number };
  }>;
}) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    const pct = d.gainLossPct;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
        <div className="font-semibold text-foreground">{d.ticker}</div>
        <div
          className="font-mono text-sm mt-0.5"
          style={{ color: pct >= 0 ? GAIN_COLOR : LOSS_COLOR }}
        >
          {pct >= 0 ? "+" : ""}
          {fmt(pct, 2)}%
        </div>
      </div>
    );
  }
  return null;
};

const ValueCostTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}) => {
  if (active && payload?.length) {
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
        <div className="font-semibold text-foreground mb-1">{label}</div>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-xs">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: p.fill }}
            />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-mono text-foreground">
              ${fmt(p.value, 2)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const AssetClassTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; value: number; pct: number };
  }>;
}) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
        <div className="font-semibold text-foreground">{d.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          <span className="text-primary font-mono">{fmt(d.pct, 1)}%</span> of
          portfolio
        </div>
      </div>
    );
  }
  return null;
};

const ChartsSectorTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { sector: string; pct: number } }>;
}) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
        <div className="font-semibold text-foreground">{d.sector}</div>
        <div className="font-mono text-primary text-sm mt-0.5">
          {fmt(d.pct, 1)}%
        </div>
      </div>
    );
  }
  return null;
};

// Custom pie label for portfolio charts
const renderCustomPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  pct,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  pct: number;
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (pct < 5) return null;
  return (
    <text
      x={x}
      y={y}
      fill="oklch(0.92 0.01 240)"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {fmt(pct, 0)}%
    </text>
  );
};

// Chart skeleton for portfolio charts section
function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="space-y-2 pt-2">
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}

// Custom tooltip for sector bar chart
const SectorTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { sector: string } }>;
}) => {
  if (active && payload?.length) {
    const entry = payload[0];
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-xl">
        <div className="font-medium text-foreground">
          {entry.payload.sector}
        </div>
        <div className="text-primary font-mono tabular">
          {fmt(entry.value, 1)}%
        </div>
      </div>
    );
  }
  return null;
};

// Custom tooltip for efficient frontier
const FrontierTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { risk: number; ret: number; isCurrent: boolean };
  }>;
}) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-xl">
        <div className="font-medium text-foreground mb-1">
          {d.isCurrent ? "Current Portfolio" : "Simulated"}
        </div>
        <div className="text-xs text-muted-foreground">
          Return:{" "}
          <span
            className={cn(
              "font-mono tabular",
              d.ret >= 0 ? "text-gain" : "text-loss",
            )}
          >
            {d.ret >= 0 ? "+" : ""}
            {fmt(d.ret, 1)}%
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Risk:{" "}
          <span className="font-mono tabular text-foreground">
            {fmt(d.risk, 1)}%
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Correlation matrix cell color
function corrColor(c: number) {
  // blue (low) → neutral → red (high)
  if (c >= 0.8) return "bg-[oklch(0.5_0.2_25)]";
  if (c >= 0.65) return "bg-[oklch(0.55_0.15_25)]";
  if (c >= 0.5) return "bg-[oklch(0.4_0.08_55)]";
  if (c >= 0.35) return "bg-[oklch(0.35_0.04_240)]";
  return "bg-[oklch(0.3_0.1_230)]";
}

export default function Analytics({ portfolioId, portfolio }: AnalyticsProps) {
  const summaryQuery = usePortfolioSummary(portfolioId);
  const assetsQuery = useAssets(portfolioId);
  const { fmtCurrency } = useCurrency();

  const summary = summaryQuery.data;
  const assets = assetsQuery.data ?? [];
  const loading = summaryQuery.isLoading || assetsQuery.isLoading;

  // ── All metric computations ─────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!summary || assets.length === 0) return null;

    const breakdowns = summary.assets;
    const totalValue = summary.totalMarketValue;
    const _totalCost = summary.totalCostBasis;

    if (totalValue === 0) return null;

    // Weighted beta
    const weightedBeta = breakdowns.reduce((acc, ab) => {
      const w = ab.value / totalValue;
      return acc + w * (ab.asset.beta ?? 1.0);
    }, 0);

    // Portfolio volatility (annualized)
    const portfolioVolatility = weightedBeta * 0.16;

    // Daily VaR at 95% confidence
    const estimatedVar95 = (portfolioVolatility * 1.645) / Math.sqrt(252);

    // Max drawdown — worst unrealized loss across assets
    const maxDrawdownPct = breakdowns.reduce((worst, ab) => {
      if (ab.cost <= 0) return worst;
      const dd = ((ab.cost - ab.value) / ab.cost) * 100;
      return dd > worst ? dd : worst;
    }, 0);

    // Risk-free rate
    const riskFreeRate = 5.0;

    // Sharpe ratio
    const totalReturnPct = summary.totalGainLossPct;
    const sharpeRatio =
      portfolioVolatility > 0
        ? (totalReturnPct - riskFreeRate) / (portfolioVolatility * 100)
        : 0;

    // Sortino ratio — downside vol using losing assets
    const losingBreakdowns = breakdowns.filter((ab) => ab.gainLoss < 0);
    const downsideVol =
      losingBreakdowns.length > 0
        ? losingBreakdowns.reduce((acc, ab) => {
            const w = ab.value / totalValue;
            return acc + w * (ab.asset.beta ?? 1.0);
          }, 0) * 0.16
        : portfolioVolatility;
    const sortinoRatio =
      downsideVol > 0
        ? (totalReturnPct - riskFreeRate) / (downsideVol * 100)
        : 0;

    // Avg P/E ratio
    const peAssets = assets.filter(
      (a) => a.peRatio != null && (a.peRatio ?? 0) > 0,
    );
    const avgPeRatio =
      peAssets.length > 0
        ? peAssets.reduce((s, a) => s + (a.peRatio ?? 0), 0) / peAssets.length
        : null;

    // Avg dividend yield
    const divAssets = assets.filter(
      (a) => a.dividendYield != null && (a.dividendYield ?? 0) > 0,
    );
    const avgDividendYield =
      divAssets.length > 0
        ? (divAssets.reduce((s, a) => s + (a.dividendYield ?? 0), 0) /
            divAssets.length) *
          100
        : null;

    return {
      weightedBeta,
      portfolioVolatility,
      estimatedVar95,
      maxDrawdownPct,
      sharpeRatio,
      sortinoRatio,
      avgPeRatio,
      avgDividendYield,
      totalReturnPct,
      riskFreeRate,
    };
  }, [summary, assets]);

  // ── Sector Concentration ───────────────────────────────────────────────────
  const sectorData = useMemo(() => {
    if (!summary || summary.totalMarketValue === 0) return [];

    const byGroup: Record<string, number> = {};
    for (const ab of summary.assets) {
      const key = ab.asset.sector ?? ab.asset.assetType ?? "Other";
      byGroup[key] = (byGroup[key] ?? 0) + ab.value;
    }

    return Object.entries(byGroup)
      .map(([sector, value]) => ({
        sector,
        pct: (value / summary.totalMarketValue) * 100,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [summary]);

  // ── Efficient Frontier (simulated) ────────────────────────────────────────
  const frontierData = useMemo(() => {
    if (!summary || summary.assets.length === 0)
      return { sims: [], current: null };

    const breakdowns = summary.assets;
    const n = breakdowns.length;
    const totalValue = summary.totalMarketValue;

    // Current portfolio point
    const currentRet = summary.totalGainLossPct;
    const currentBeta = breakdowns.reduce((acc, ab) => {
      const w = ab.value / totalValue;
      return acc + w * (ab.asset.beta ?? 1.0);
    }, 0);
    const currentRisk = currentBeta * 0.16 * 100;

    // Generate 20 random weight combos
    const sims: { risk: number; ret: number; isCurrent: boolean }[] = [];

    // Use a deterministic pseudo-random seed for consistency
    let seed = 42;
    function rand() {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0xffffffff;
    }

    for (let i = 0; i < 20; i++) {
      // Random weights, normalized
      const rawW = Array.from({ length: n }, () => rand() + 0.01);
      const total = rawW.reduce((s, v) => s + v, 0);
      const weights = rawW.map((v) => v / total);

      const ret = breakdowns.reduce(
        (acc, ab, idx) => acc + weights[idx] * ab.gainLossPct,
        0,
      );
      const beta = breakdowns.reduce(
        (acc, ab, idx) => acc + weights[idx] * (ab.asset.beta ?? 1.0),
        0,
      );
      const risk = beta * 0.16 * 100;

      sims.push({ risk, ret, isCurrent: false });
    }

    const current = { risk: currentRisk, ret: currentRet, isCurrent: true };
    return { sims, current };
  }, [summary]);

  // ── Correlation Matrix (sector-level) ─────────────────────────────────────
  const correlationData = useMemo(() => {
    if (!summary || summary.assets.length === 0)
      return { labels: [], matrix: [] };

    // Collect unique sectors
    const sectorSet = new Set<string>();
    for (const ab of summary.assets) {
      sectorSet.add(ab.asset.sector ?? ab.asset.assetType ?? "Other");
    }
    const labels = Array.from(sectorSet);

    // Build correlation between each pair
    const matrix: number[][] = labels.map((labelA) =>
      labels.map((labelB) => {
        if (labelA === labelB) return 1.0;

        const aIsCrypto =
          labelA.toLowerCase() === "crypto" ||
          labelA.toLowerCase() === "cryptocurrency";
        const bIsCrypto =
          labelB.toLowerCase() === "crypto" ||
          labelB.toLowerCase() === "cryptocurrency";

        if (aIsCrypto && bIsCrypto) return 0.85;
        if (aIsCrypto || bIsCrypto) return 0.15;
        // Both stocks, different sectors
        return (
          0.3 +
          (Math.abs(labelA.charCodeAt(0) - labelB.charCodeAt(0)) % 3) * 0.1
        );
      }),
    );

    return { labels, matrix };
  }, [summary]);

  // ── Factor exposure ratings ────────────────────────────────────────────────
  const factorRatings = useMemo(() => {
    if (!metrics) return null;

    const peRating =
      metrics.avgPeRatio == null
        ? "Moderate"
        : metrics.avgPeRatio > 35
          ? "High"
          : metrics.avgPeRatio > 18
            ? "Moderate"
            : "Low";

    const growthRating =
      metrics.weightedBeta > 1.2
        ? "High"
        : metrics.weightedBeta > 0.85
          ? "Moderate"
          : "Low";

    const incomeRating =
      metrics.avgDividendYield == null
        ? "Low"
        : metrics.avgDividendYield > 3
          ? "High"
          : metrics.avgDividendYield > 1
            ? "Moderate"
            : "Low";

    const volatilityRating =
      metrics.portfolioVolatility * 100 > 20
        ? "High"
        : metrics.portfolioVolatility * 100 > 12
          ? "Moderate"
          : "Low";

    return { peRating, growthRating, incomeRating, volatilityRating };
  }, [metrics]);

  // ── Portfolio Charts Data ──────────────────────────────────────────────────

  // 1. Portfolio Allocation (donut)
  const allocationData = useMemo(() => {
    if (!summary) return [];
    return summary.assets.map((ab) => ({
      name: ab.asset.ticker,
      value: ab.value,
      pct: ab.actualAllocationPct,
    }));
  }, [summary]);

  // 2. Gain / Loss by Asset (horizontal bar)
  const gainLossData = useMemo(() => {
    if (!summary) return [];
    return [...summary.assets]
      .sort((a, b) => b.gainLossPct - a.gainLossPct)
      .map((ab) => ({
        ticker: ab.asset.ticker,
        gainLossPct: ab.gainLossPct,
        fill: ab.gainLossPct >= 0 ? GAIN_COLOR : LOSS_COLOR,
      }));
  }, [summary]);

  // 3. Value vs Cost Basis (grouped bar)
  const valueCostData = useMemo(() => {
    if (!summary) return [];
    return summary.assets.map((ab) => ({
      ticker: ab.asset.ticker,
      "Market Value": ab.value,
      "Cost Basis": ab.cost,
    }));
  }, [summary]);

  // 4. Asset Class Split (donut)
  const assetClassData = useMemo(() => {
    if (!summary || summary.totalMarketValue === 0) return [];
    const byType: Record<string, number> = {};
    for (const ab of summary.assets) {
      const key = ab.asset.assetType ?? "Other";
      byType[key] = (byType[key] ?? 0) + ab.value;
    }
    return Object.entries(byType).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      pct: (value / summary.totalMarketValue) * 100,
    }));
  }, [summary]);

  // 5. Sector Concentration for portfolio charts (horizontal bar)
  const sectorChartData = useMemo(() => {
    if (!summary || summary.totalMarketValue === 0) return [];
    const byGroup: Record<string, number> = {};
    for (const ab of summary.assets) {
      const key = ab.asset.sector ?? ab.asset.assetType ?? "Other";
      byGroup[key] = (byGroup[key] ?? 0) + ab.value;
    }
    return Object.entries(byGroup)
      .map(([sector, value]) => ({
        sector,
        pct: (value / summary.totalMarketValue) * 100,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [summary]);

  // ── Empty / loading states ─────────────────────────────────────────────────
  if (!portfolioId || !portfolio) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No Portfolio Selected</h2>
          <p className="text-sm text-muted-foreground">
            Select a portfolio from the sidebar to view analytics.
          </p>
        </div>
      </div>
    );
  }

  const hasAssets = !loading && assets.length > 0;
  const noAssetsState = !loading && assets.length === 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-primary" />
          <div>
            <h1 className="text-lg font-semibold font-display text-foreground">
              Analytics
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {portfolio.name} — professional risk &amp; performance metrics
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {noAssetsState && (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">
                No assets to analyze
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Add assets to your portfolio in Holdings to compute risk metrics
                and factor exposure.
              </p>
            </CardContent>
          </Card>
        )}

        {(loading || hasAssets) && (
          <>
            {/* ── Section 1: Risk Summary Cards ──────────────────────────────── */}
            <section>
              <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
                Risk &amp; Performance
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <MetricCard
                  label="Sharpe Ratio"
                  value={loading ? "—" : fmt(metrics?.sharpeRatio ?? 0, 2)}
                  subtext="Return per unit of risk"
                  tone={
                    loading
                      ? "neutral"
                      : (metrics?.sharpeRatio ?? 0) >= 1
                        ? "good"
                        : (metrics?.sharpeRatio ?? 0) >= 0
                          ? "warn"
                          : "bad"
                  }
                  loading={loading}
                  icon={TrendingUp}
                />
                <MetricCard
                  label="Sortino Ratio"
                  value={loading ? "—" : fmt(metrics?.sortinoRatio ?? 0, 2)}
                  subtext="Downside risk-adjusted"
                  tone={
                    loading
                      ? "neutral"
                      : (metrics?.sortinoRatio ?? 0) >= 1
                        ? "good"
                        : (metrics?.sortinoRatio ?? 0) >= 0
                          ? "warn"
                          : "bad"
                  }
                  loading={loading}
                  icon={TrendingUp}
                />
                <MetricCard
                  label="Portfolio Beta"
                  value={loading ? "—" : fmt(metrics?.weightedBeta ?? 0, 2)}
                  subtext="Market sensitivity"
                  tone={
                    loading
                      ? "neutral"
                      : (metrics?.weightedBeta ?? 1) <= 1
                        ? "good"
                        : "warn"
                  }
                  loading={loading}
                  icon={Activity}
                />
                <MetricCard
                  label="Max Drawdown"
                  value={
                    loading ? "—" : `-${fmt(metrics?.maxDrawdownPct ?? 0, 1)}%`
                  }
                  subtext="Worst unrealized loss"
                  tone={
                    loading
                      ? "neutral"
                      : (metrics?.maxDrawdownPct ?? 0) < 10
                        ? "good"
                        : (metrics?.maxDrawdownPct ?? 0) < 25
                          ? "warn"
                          : "bad"
                  }
                  loading={loading}
                  icon={TrendingDown}
                />
                <MetricCard
                  label="Daily VaR 95%"
                  value={
                    loading
                      ? "—"
                      : `-${fmt((metrics?.estimatedVar95 ?? 0) * 100, 2)}%`
                  }
                  subtext="Expected daily max loss"
                  tone={
                    loading
                      ? "neutral"
                      : (metrics?.estimatedVar95 ?? 0) * 100 < 1
                        ? "good"
                        : (metrics?.estimatedVar95 ?? 0) * 100 < 2
                          ? "warn"
                          : "bad"
                  }
                  loading={loading}
                  icon={AlertTriangle}
                />
                <MetricCard
                  label="Avg P/E Ratio"
                  value={
                    loading
                      ? "—"
                      : metrics?.avgPeRatio == null
                        ? "N/A"
                        : fmt(metrics.avgPeRatio, 1)
                  }
                  subtext={
                    metrics?.avgPeRatio == null
                      ? "Add P/E data in Holdings"
                      : "Blended valuation"
                  }
                  tone={
                    loading || metrics?.avgPeRatio == null
                      ? "neutral"
                      : (metrics.avgPeRatio ?? 0) < 20
                        ? "good"
                        : (metrics.avgPeRatio ?? 0) < 35
                          ? "warn"
                          : "bad"
                  }
                  loading={loading}
                  icon={BarChart2}
                />
              </div>
            </section>

            {/* ── Section 2: Factor Exposure ──────────────────────────────────── */}
            <section>
              <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
                Factor Exposure
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <FactorCard
                  label="Value Factor"
                  value={
                    loading
                      ? "—"
                      : metrics?.avgPeRatio == null
                        ? "N/A"
                        : `P/E ${fmt(metrics.avgPeRatio, 1)}`
                  }
                  rating={
                    (factorRatings?.peRating as "High" | "Moderate" | "Low") ??
                    "Moderate"
                  }
                  description={
                    loading
                      ? "Loading..."
                      : metrics?.avgPeRatio == null
                        ? "Add P/E ratios in Holdings to assess valuation."
                        : (metrics.avgPeRatio ?? 0) < 15
                          ? "Deep value — assets trade significantly below market average."
                          : (metrics.avgPeRatio ?? 0) < 28
                            ? "Fairly valued — blended P/E in-line with historical norms."
                            : "Growth premium — market pricing in significant future earnings."
                  }
                  loading={loading}
                />
                <FactorCard
                  label="Growth Factor"
                  value={
                    loading ? "—" : `β ${fmt(metrics?.weightedBeta ?? 0, 2)}`
                  }
                  rating={
                    (factorRatings?.growthRating as
                      | "High"
                      | "Moderate"
                      | "Low") ?? "Moderate"
                  }
                  description={
                    loading
                      ? "Loading..."
                      : (metrics?.weightedBeta ?? 1) > 1.2
                        ? "High growth tilt — portfolio amplifies market moves."
                        : (metrics?.weightedBeta ?? 1) < 0.8
                          ? "Defensive — portfolio less sensitive to market swings."
                          : "Market-like beta — broadly in line with index sensitivity."
                  }
                  loading={loading}
                />
                <FactorCard
                  label="Income Factor"
                  value={
                    loading
                      ? "—"
                      : metrics?.avgDividendYield == null
                        ? "N/A"
                        : `${fmt(metrics.avgDividendYield, 2)}%`
                  }
                  rating={
                    (factorRatings?.incomeRating as
                      | "High"
                      | "Moderate"
                      | "Low") ?? "Low"
                  }
                  description={
                    loading
                      ? "Loading..."
                      : metrics?.avgDividendYield == null
                        ? "No dividend data. Add yields in Holdings."
                        : (metrics.avgDividendYield ?? 0) > 3
                          ? "Income-oriented — solid yield relative to bonds."
                          : (metrics.avgDividendYield ?? 0) > 1
                            ? "Modest yield — some income component present."
                            : "Growth-focused — minimal income generation."
                  }
                  loading={loading}
                />
                <FactorCard
                  label="Volatility Factor"
                  value={
                    loading
                      ? "—"
                      : `${fmt((metrics?.portfolioVolatility ?? 0) * 100, 1)}%`
                  }
                  rating={
                    (factorRatings?.volatilityRating as
                      | "High"
                      | "Moderate"
                      | "Low") ?? "Moderate"
                  }
                  description={
                    loading
                      ? "Loading..."
                      : (metrics?.portfolioVolatility ?? 0) * 100 > 20
                        ? "High volatility — expect significant price swings."
                        : (metrics?.portfolioVolatility ?? 0) * 100 > 12
                          ? "Moderate volatility — typical diversified portfolio range."
                          : "Low volatility — stable, defensive positioning."
                  }
                  loading={loading}
                />
              </div>
            </section>

            {/* ── Section 3: Sector Concentration + Correlation ───────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Sector Concentration Bar Chart */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Sector Concentration
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Allocation % by sector or asset class
                  </p>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2 pt-2">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-8 w-full rounded" />
                      ))}
                    </div>
                  ) : sectorData.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                      No sector data
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={sectorData}
                        layout="vertical"
                        margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
                      >
                        <CartesianGrid
                          horizontal={false}
                          stroke="oklch(0.28 0.015 240 / 0.5)"
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{
                            fill: "oklch(0.55 0.015 240)",
                            fontSize: 11,
                            fontFamily: "monospace",
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="sector"
                          tick={{
                            fill: "oklch(0.7 0.01 240)",
                            fontSize: 11,
                          }}
                          axisLine={false}
                          tickLine={false}
                          width={80}
                        />
                        <Tooltip content={<SectorTooltip />} />
                        <Bar
                          dataKey="pct"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={24}
                        >
                          {sectorData.map((entry, idx) => (
                            <Cell
                              key={`sector-${entry.sector}`}
                              fill={CHART_COLORS[idx % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Correlation Matrix */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Correlation Matrix
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Pairwise sector correlation — red = high, blue = low
                  </p>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="grid grid-cols-3 gap-1 pt-2">
                      {["a", "b", "c", "d", "e", "f", "g", "h", "i"].map(
                        (k) => (
                          <Skeleton key={k} className="h-10 rounded" />
                        ),
                      )}
                    </div>
                  ) : correlationData.labels.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                      No data
                    </div>
                  ) : (
                    <div className="overflow-auto mt-2">
                      <div
                        className="grid gap-0.5 min-w-max"
                        style={{
                          gridTemplateColumns: `80px repeat(${correlationData.labels.length}, 1fr)`,
                        }}
                      >
                        {/* Header row */}
                        <div className="h-8" />
                        {correlationData.labels.map((lbl) => (
                          <div
                            key={lbl}
                            className="h-8 flex items-center justify-center text-[9px] font-medium text-muted-foreground uppercase tracking-wide truncate px-1"
                          >
                            {lbl.slice(0, 6)}
                          </div>
                        ))}

                        {/* Data rows */}
                        {correlationData.labels.map((rowLabel, ri) => (
                          <>
                            <div
                              key={`row-${rowLabel}`}
                              className="h-8 flex items-center text-[9px] font-medium text-muted-foreground uppercase tracking-wide pr-2 truncate"
                            >
                              {rowLabel.slice(0, 8)}
                            </div>
                            {correlationData.matrix[ri].map((corr, ci) => (
                              <div
                                key={`cell-${rowLabel}-${correlationData.labels[ci]}`}
                                className={cn(
                                  "h-8 flex items-center justify-center rounded text-[10px] font-mono tabular font-medium",
                                  corrColor(corr),
                                  corr >= 0.5
                                    ? "text-foreground"
                                    : "text-foreground/70",
                                )}
                                title={`${rowLabel} ↔ ${correlationData.labels[ci]}: ${fmt(corr, 2)}`}
                              >
                                {fmt(corr, 2)}
                              </div>
                            ))}
                          </>
                        ))}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <div className="text-[10px] text-muted-foreground mr-1">
                          Correlation:
                        </div>
                        {[
                          { label: "Low", color: "bg-[oklch(0.3_0.1_230)]" },
                          { label: "Med", color: "bg-[oklch(0.35_0.04_240)]" },
                          { label: "High", color: "bg-[oklch(0.55_0.15_25)]" },
                          {
                            label: "Very High",
                            color: "bg-[oklch(0.5_0.2_25)]",
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center gap-1"
                          >
                            <div
                              className={cn("w-3 h-3 rounded-sm", item.color)}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Section 4: Efficient Frontier ────────────────────────────────── */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Efficient Frontier
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  20 simulated portfolio weight combinations vs. your current
                  allocation — star = current portfolio
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-56 w-full rounded-lg" />
                ) : frontierData.sims.length === 0 ? (
                  <div className="flex items-center justify-center h-56 text-muted-foreground text-sm">
                    Not enough data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <ScatterChart
                      margin={{ top: 16, right: 24, bottom: 16, left: 0 }}
                    >
                      <CartesianGrid
                        stroke="oklch(0.28 0.015 240 / 0.5)"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="risk"
                        type="number"
                        name="Risk"
                        tickFormatter={(v) => `${fmt(v, 1)}%`}
                        label={{
                          value: "Risk (Ann. Vol %)",
                          position: "insideBottom",
                          offset: -8,
                          fill: "oklch(0.55 0.015 240)",
                          fontSize: 11,
                        }}
                        tick={{
                          fill: "oklch(0.55 0.015 240)",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        dataKey="ret"
                        type="number"
                        name="Return"
                        tickFormatter={(v) => `${fmt(v, 1)}%`}
                        label={{
                          value: "Return %",
                          angle: -90,
                          position: "insideLeft",
                          offset: 8,
                          fill: "oklch(0.55 0.015 240)",
                          fontSize: 11,
                        }}
                        tick={{
                          fill: "oklch(0.55 0.015 240)",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<FrontierTooltip />} />
                      {/* Simulated portfolios */}
                      <Scatter
                        data={frontierData.sims}
                        fill="oklch(0.68 0.18 200 / 0.5)"
                        strokeWidth={0}
                        r={5}
                      />
                      {/* Current portfolio */}
                      {frontierData.current && (
                        <Scatter
                          data={[frontierData.current]}
                          fill="oklch(0.72 0.16 185)"
                          stroke="oklch(0.92 0.01 240)"
                          strokeWidth={1.5}
                          r={8}
                          shape={(props: { cx?: number; cy?: number }) => {
                            const { cx = 0, cy = 0 } = props;
                            // Star shape via polygon
                            const size = 9;
                            const points = Array.from(
                              { length: 10 },
                              (_, i) => {
                                const angle = (i * Math.PI) / 5 - Math.PI / 2;
                                const r = i % 2 === 0 ? size : size * 0.4;
                                return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                              },
                            ).join(" ");
                            return (
                              <polygon
                                points={points}
                                fill="oklch(0.72 0.16 185)"
                                stroke="oklch(0.92 0.01 240)"
                                strokeWidth={1.5}
                              />
                            );
                          }}
                        />
                      )}
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* ── Section 5: Portfolio Charts ──────────────────────────────────── */}
            <section>
              <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
                Portfolio Charts
              </div>

              {/* Row 1: Allocation donut + Gain/Loss bar */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
                {/* 1. Portfolio Allocation Donut */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Portfolio Allocation
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Current market value distribution by asset
                    </p>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <ChartSkeleton height={280} />
                    ) : allocationData.length === 0 ? (
                      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                        No data
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={allocationData}
                            cx="50%"
                            cy="45%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={2}
                            dataKey="value"
                            labelLine={false}
                            label={renderCustomPieLabel}
                          >
                            {allocationData.map((entry, idx) => (
                              <Cell
                                key={`alloc-${entry.name}`}
                                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<AllocationTooltip />} />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{
                              fontSize: "11px",
                              color: "oklch(0.7 0.01 240)",
                            }}
                            formatter={(value) => (
                              <span style={{ color: "oklch(0.7 0.01 240)" }}>
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Gain / Loss by Asset */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Gain / Loss by Asset
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Unrealized return % per holding
                    </p>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <ChartSkeleton height={280} />
                    ) : gainLossData.length === 0 ? (
                      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                        No data
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                          data={gainLossData}
                          layout="vertical"
                          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
                        >
                          <CartesianGrid
                            horizontal={false}
                            stroke={GRID_STROKE}
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            type="number"
                            tickFormatter={(v) =>
                              `${v >= 0 ? "+" : ""}${fmt(v, 0)}%`
                            }
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="ticker"
                            tick={{ fill: "oklch(0.7 0.01 240)", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={50}
                          />
                          <Tooltip content={<GainLossTooltip />} />
                          <ReferenceLine
                            x={0}
                            stroke="oklch(0.45 0.015 240)"
                            strokeWidth={1}
                          />
                          <Bar
                            dataKey="gainLossPct"
                            radius={[0, 4, 4, 0]}
                            maxBarSize={22}
                          >
                            {gainLossData.map((entry) => (
                              <Cell
                                key={`gl-${entry.ticker}`}
                                fill={entry.fill}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Value vs Cost Basis (full width) */}
              <Card className="border-border bg-card mb-5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Market Value vs Cost Basis
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Compare what you paid vs current value per asset
                  </p>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <ChartSkeleton height={300} />
                  ) : valueCostData.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                      No data
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={valueCostData}
                        margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
                        barCategoryGap="25%"
                        barGap={4}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke={GRID_STROKE}
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="ticker"
                          tick={{ fill: "oklch(0.7 0.01 240)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v) => fmtCurrency(v)}
                          tick={AXIS_TICK}
                          axisLine={false}
                          tickLine={false}
                          width={80}
                        />
                        <Tooltip content={<ValueCostTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: "11px" }}
                          formatter={(value) => (
                            <span style={{ color: "oklch(0.7 0.01 240)" }}>
                              {value}
                            </span>
                          )}
                        />
                        <Bar
                          dataKey="Market Value"
                          fill={CHART_COLORS[0]}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                        <Bar
                          dataKey="Cost Basis"
                          fill={CHART_COLORS[2]}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Row 3: Asset Class Split donut + Sector bar */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* 4. Asset Class Split Donut */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Asset Class Split
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Portfolio weight by asset class (stock vs crypto)
                    </p>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <ChartSkeleton height={260} />
                    ) : assetClassData.length === 0 ? (
                      <div className="flex items-center justify-center h-56 text-muted-foreground text-sm">
                        No data
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={assetClassData}
                            cx="50%"
                            cy="44%"
                            innerRadius={65}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            labelLine={false}
                            label={renderCustomPieLabel}
                          >
                            {assetClassData.map((entry, idx) => (
                              <Cell
                                key={`cls-${entry.name}`}
                                fill={
                                  CHART_COLORS[(idx + 3) % CHART_COLORS.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<AssetClassTooltip />} />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: "11px" }}
                            formatter={(value) => (
                              <span style={{ color: "oklch(0.7 0.01 240)" }}>
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* 5. Sector Concentration (portfolio charts version) */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Sector Concentration
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Allocation % by sector or asset class
                    </p>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <ChartSkeleton height={260} />
                    ) : sectorChartData.length === 0 ? (
                      <div className="flex items-center justify-center h-56 text-muted-foreground text-sm">
                        No sector data
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={sectorChartData}
                          layout="vertical"
                          margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
                        >
                          <CartesianGrid
                            horizontal={false}
                            stroke={GRID_STROKE}
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="sector"
                            tick={{
                              fill: "oklch(0.7 0.01 240)",
                              fontSize: 11,
                            }}
                            axisLine={false}
                            tickLine={false}
                            width={80}
                          />
                          <Tooltip content={<ChartsSectorTooltip />} />
                          <Bar
                            dataKey="pct"
                            radius={[0, 4, 4, 0]}
                            maxBarSize={24}
                          >
                            {sectorChartData.map((entry, idx) => (
                              <Cell
                                key={`sec-${entry.sector}`}
                                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ── Section 6: Methodology note ─────────────────────────────────── */}
            <Card className="border-border bg-card/50">
              <CardContent className="py-4">
                <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
                  <div className="font-medium text-foreground/70 mb-1 uppercase tracking-wider text-[10px]">
                    Methodology Notes
                  </div>
                  <p>
                    <strong>Beta</strong> is weighted by current value. Missing
                    betas default to 1.0 (market-equivalent). Annualized
                    volatility uses a 16% market proxy (S&P 500 long-run
                    average).
                  </p>
                  <p>
                    <strong>Sharpe &amp; Sortino</strong> use 5.0% risk-free
                    rate (approximate current T-bill yield). Positive ratios
                    indicate return above risk-free after adjusting for risk.
                  </p>
                  <p>
                    <strong>VaR (95%)</strong> is a simplified parametric
                    estimate. Real VaR requires full return history.{" "}
                    <strong>Max Drawdown</strong> reflects worst current
                    unrealized loss, not historical peak-to-trough.
                  </p>
                  <p>
                    <strong>Efficient Frontier</strong> is illustrative — 20
                    simulated random weight combinations using the same assets.
                    Not investable without constraints.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
