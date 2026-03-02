import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  BarChart2,
  LineChart as LineChartIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Asset, Portfolio } from "../backend.d";
import { useCurrency } from "../hooks/useCurrency";
import { useAssets } from "../hooks/useQueries";

interface ChartsProps {
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

const CANDLE_UP = "oklch(0.72 0.16 145)";
const CANDLE_DOWN = "oklch(0.65 0.2 25)";
const GRID_STROKE = "oklch(0.28 0.015 240 / 0.5)";

// ── Deterministic LCG random number generator ──────────────────────────────

function createLCG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function tickerSeed(ticker: string): number {
  return ticker.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

// ── OHLCV data generation ──────────────────────────────────────────────────

interface OHLCVPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  // Precomputed pixel offsets for candlestick rendering (0-1 normalized)
  openN: number;
  highN: number;
  lowN: number;
  closeN: number;
}

function generateOHLCV(asset: Asset, chartPxHeight: number): OHLCVPoint[] {
  const price =
    asset.currentPrice > 0
      ? asset.currentPrice
      : asset.avgBuyPrice > 0
        ? asset.avgBuyPrice
        : 100;
  const rand = createLCG(tickerSeed(asset.ticker) + Math.round(price * 100));

  const DAYS = 60;
  const BASE_PRICE = price * 0.85;

  const points: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }> = [];

  let prevClose = BASE_PRICE;

  for (let i = 0; i < DAYS; i++) {
    const d = new Date(Date.now() - (DAYS - i) * 24 * 60 * 60 * 1000);
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = String(d.getDate()).padStart(2, "0");
    const date = `${month} ${day}`;

    const open = prevClose * (1 + (rand() - 0.5) * 0.01);
    const change = (rand() - 0.48) * 0.04; // slight upward bias
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + rand() * 0.012);
    const low = Math.min(open, close) * (1 - rand() * 0.012);

    points.push({ date, open, high, low, close });
    prevClose = close;
  }

  // Compute normalized positions for custom candlestick rendering
  const allValues = points.flatMap((p) => [p.high, p.low]);
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yRange = yMax - yMin || 1;

  const normalize = (v: number) => 1 - (v - yMin) / yRange; // 0=top, 1=bottom

  return points.map((p) => ({
    ...p,
    openN: normalize(p.open) * chartPxHeight,
    highN: normalize(p.high) * chartPxHeight,
    lowN: normalize(p.low) * chartPxHeight,
    closeN: normalize(p.close) * chartPxHeight,
  }));
}

// ── Candlestick custom shape ───────────────────────────────────────────────

// The OHLCV data includes precomputed pixel offsets (openN, closeN, highN, lowN)
// relative to chartPxHeight. We use these for accurate candle drawing.
const CandleShape = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: OHLCVPoint;
}) => {
  const { x = 0, width = 4, payload } = props;
  if (!payload) return null;

  const { openN, closeN, highN, lowN } = payload;
  const isUp = payload.close >= payload.open;
  const color = isUp ? CANDLE_UP : CANDLE_DOWN;

  const bodyTop = Math.min(openN, closeN);
  const bodyBottom = Math.max(openN, closeN);
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

  const cx = x + width / 2;
  const wickWidth = 1.5;

  return (
    <g>
      {/* High-Low wick */}
      <line
        x1={cx}
        y1={highN}
        x2={cx}
        y2={lowN}
        stroke={color}
        strokeWidth={wickWidth}
      />
      {/* Open-Close body */}
      <rect
        x={x + 1}
        y={bodyTop}
        width={Math.max(width - 2, 2)}
        height={bodyHeight}
        fill={isUp ? color : color}
        stroke={color}
        strokeWidth={1}
        fillOpacity={isUp ? 0.85 : 1}
      />
    </g>
  );
};

// ── Tooltip components ─────────────────────────────────────────────────────

const LineTooltip = ({
  active,
  payload,
  fmtCurrency,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: OHLCVPoint }>;
  fmtCurrency: (v: number) => string;
}) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
        <div className="text-xs text-muted-foreground mb-1">{d.date}</div>
        <div className="font-mono font-semibold text-foreground">
          {fmtCurrency(d.close)}
        </div>
      </div>
    );
  }
  return null;
};

const CandleTooltip = ({
  active,
  payload,
  fmtCurrency,
}: {
  active?: boolean;
  payload?: Array<{ payload: OHLCVPoint }>;
  fmtCurrency: (v: number) => string;
}) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    const isUp = d.close >= d.open;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
        <div className="text-xs text-muted-foreground mb-1.5">{d.date}</div>
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Open</span>
            <span className="font-mono text-foreground">
              {fmtCurrency(d.open)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">High</span>
            <span className="font-mono text-foreground">
              {fmtCurrency(d.high)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Low</span>
            <span className="font-mono text-foreground">
              {fmtCurrency(d.low)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Close</span>
            <span
              className="font-mono font-semibold"
              style={{ color: isUp ? CANDLE_UP : CANDLE_DOWN }}
            >
              {fmtCurrency(d.close)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ── Asset price chart card ─────────────────────────────────────────────────

const CHART_PX_HEIGHT = 200; // usable pixel height for candle math

function AssetChartCard({
  asset,
  colorIndex,
  chartType,
  onToggle,
  fmtCurrency,
}: {
  asset: Asset;
  colorIndex: number;
  chartType: "line" | "candle";
  onToggle: (type: "line" | "candle") => void;
  fmtCurrency: (v: number) => string;
}) {
  const data = useMemo(() => generateOHLCV(asset, CHART_PX_HEIGHT), [asset]);
  const color = CHART_COLORS[colorIndex % CHART_COLORS.length];

  // Only show every ~10th date label
  const xTickIndices = useMemo(() => {
    const step = Math.ceil(data.length / 6);
    return new Set(data.map((_, i) => i).filter((i) => i % step === 0));
  }, [data]);

  const hasPrice = asset.currentPrice > 0 || asset.avgBuyPrice > 0;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              {asset.ticker}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
              {asset.name}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={chartType === "line" ? "default" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={() => onToggle("line")}
            >
              <LineChartIcon className="w-3 h-3" />
              Line
            </Button>
            <Button
              variant={chartType === "candle" ? "default" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={() => onToggle("candle")}
            >
              <BarChart2 className="w-3 h-3" />
              Candle
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasPrice ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            No price data available
          </div>
        ) : chartType === "line" ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
            >
              <CartesianGrid
                stroke={GRID_STROKE}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "oklch(0.7 0.01 240)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                tickFormatter={(val, idx) => (xTickIndices.has(idx) ? val : "")}
              />
              <YAxis
                tickFormatter={(v) => fmtCurrency(v)}
                tick={{ fill: "oklch(0.55 0.015 240)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip content={<LineTooltip fmtCurrency={fmtCurrency} />} />
              <Line
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
            >
              <CartesianGrid
                stroke={GRID_STROKE}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "oklch(0.7 0.01 240)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                tickFormatter={(val, idx) => (xTickIndices.has(idx) ? val : "")}
              />
              <YAxis
                tickFormatter={(v) => fmtCurrency(v)}
                tick={{ fill: "oklch(0.55 0.015 240)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip content={<CandleTooltip fmtCurrency={fmtCurrency} />} />
              {/* Invisible bar just for layout/spacing; candle shape does the drawing */}
              <Bar
                dataKey="close"
                shape={(props: {
                  x?: number;
                  y?: number;
                  width?: number;
                  height?: number;
                  payload?: OHLCVPoint;
                }) => <CandleShape {...props} />}
                isAnimationActive={false}
                maxBarSize={14}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Charts({ portfolioId, portfolio }: ChartsProps) {
  const assetsQuery = useAssets(portfolioId);
  const { fmtCurrency } = useCurrency();

  const assets = assetsQuery.data ?? [];
  const loading = assetsQuery.isLoading;

  // Per-asset chart type state: { [assetId]: 'line' | 'candle' }
  const [chartTypes, setChartTypes] = useState<
    Record<string, "line" | "candle">
  >({});

  const getChartType = (assetId: string): "line" | "candle" =>
    chartTypes[assetId] ?? "line";

  const setChartType = (assetId: string, type: "line" | "candle") => {
    setChartTypes((prev) => ({ ...prev, [assetId]: type }));
  };

  // ── Empty / no portfolio states ─────────────────────────────────────────────
  if (!portfolioId || !portfolio) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No Portfolio Selected</h2>
          <p className="text-sm text-muted-foreground">
            Select a portfolio from the sidebar to view charts.
          </p>
        </div>
      </div>
    );
  }

  const noAssetsState = !loading && assets.length === 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-4 h-4 text-primary" />
          <div>
            <h1 className="text-lg font-semibold font-display text-foreground">
              Charts
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {portfolio.name} — per-asset price history (simulated)
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">
        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <div className="flex gap-1">
                      <Skeleton className="h-7 w-16" />
                      <Skeleton className="h-7 w-20" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No assets state */}
        {noAssetsState && (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">No assets yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Add assets to your portfolio in Holdings to see price charts.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Asset chart grid */}
        {!loading && assets.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {assets.map((asset, idx) => (
              <AssetChartCard
                key={asset.id.toString()}
                asset={asset}
                colorIndex={idx}
                chartType={getChartType(asset.id.toString())}
                onToggle={(type) => setChartType(asset.id.toString(), type)}
                fmtCurrency={fmtCurrency}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        {!loading && assets.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-center pb-2">
            Price history is simulated for illustration purposes only. Data does
            not reflect real market prices.
          </p>
        )}
      </div>
    </div>
  );
}
