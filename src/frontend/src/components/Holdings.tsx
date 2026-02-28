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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Asset, Portfolio } from "../backend.d";
import {
  useAddAsset,
  useAssets,
  useRemoveAsset,
  useUpdateAsset,
} from "../hooks/useQueries";

interface HoldingsProps {
  portfolioId: bigint | null;
  portfolio: Portfolio | undefined;
}

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

function fmtMarketCap(val: number): string {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return fmtCurrency(val);
}

interface AssetFormData {
  ticker: string;
  name: string;
  assetType: string;
  quantity: string;
  avgBuyPrice: string;
  currentPrice: string;
  targetAllocationPct: string;
  // Analytics fields
  marketCap: string;
  peRatio: string;
  sector: string;
  dividendYield: string;
  beta: string;
  notes: string;
}

const emptyForm: AssetFormData = {
  ticker: "",
  name: "",
  assetType: "stock",
  quantity: "",
  avgBuyPrice: "",
  currentPrice: "",
  targetAllocationPct: "",
  marketCap: "",
  peRatio: "",
  sector: "",
  dividendYield: "",
  beta: "",
  notes: "",
};

const SECTORS = [
  "Technology",
  "Healthcare",
  "Financials",
  "Energy",
  "Consumer Discretionary",
  "Utilities",
  "Materials",
  "Industrials",
  "Real Estate",
  "Crypto",
  "Communication Services",
  "Consumer Staples",
];

function validateForm(form: AssetFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.ticker.trim()) errors.ticker = "Required";
  if (!form.name.trim()) errors.name = "Required";
  if (!form.assetType) errors.assetType = "Required";
  const qty = Number.parseFloat(form.quantity);
  if (Number.isNaN(qty) || qty <= 0) errors.quantity = "Must be > 0";
  const avg = Number.parseFloat(form.avgBuyPrice);
  if (Number.isNaN(avg) || avg <= 0) errors.avgBuyPrice = "Must be > 0";
  const cur = Number.parseFloat(form.currentPrice);
  if (Number.isNaN(cur) || cur <= 0) errors.currentPrice = "Must be > 0";
  const tgt = Number.parseFloat(form.targetAllocationPct);
  if (Number.isNaN(tgt) || tgt < 0 || tgt > 100)
    errors.targetAllocationPct = "Must be 0–100";
  // Optional analytics validation
  if (form.marketCap !== "" && Number.isNaN(Number.parseFloat(form.marketCap)))
    errors.marketCap = "Must be a number";
  if (form.peRatio !== "" && Number.isNaN(Number.parseFloat(form.peRatio)))
    errors.peRatio = "Must be a number";
  if (
    form.dividendYield !== "" &&
    Number.isNaN(Number.parseFloat(form.dividendYield))
  )
    errors.dividendYield = "Must be a number";
  if (form.beta !== "" && Number.isNaN(Number.parseFloat(form.beta)))
    errors.beta = "Must be a number";
  return errors;
}

function AssetFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "add" | "edit";
  initialData?: AssetFormData;
  onSubmit: (data: AssetFormData) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<AssetFormData>(initialData ?? emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAnalytics, setShowAnalytics] = useState(false);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setForm(initialData ?? emptyForm);
      setErrors({});
      setShowAnalytics(false);
    }
    onOpenChange(v);
  };

  const set = (field: keyof AssetFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Asset" : "Edit Asset"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Add a new asset to your portfolio."
              : "Update asset details."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Ticker */}
            <div>
              <Label className="text-xs mb-1.5 block">Ticker *</Label>
              <Input
                placeholder="AAPL"
                value={form.ticker}
                onChange={(e) => set("ticker", e.target.value.toUpperCase())}
                className={cn(errors.ticker && "border-destructive")}
              />
              {errors.ticker && (
                <p className="text-xs text-destructive mt-1">{errors.ticker}</p>
              )}
            </div>

            {/* Name */}
            <div>
              <Label className="text-xs mb-1.5 block">Name *</Label>
              <Input
                placeholder="Apple Inc."
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={cn(errors.name && "border-destructive")}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            {/* Asset Type */}
            <div>
              <Label className="text-xs mb-1.5 block">Asset Type *</Label>
              <Select
                value={form.assetType}
                onValueChange={(v) => set("assetType", v)}
              >
                <SelectTrigger
                  className={cn(errors.assetType && "border-destructive")}
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                </SelectContent>
              </Select>
              {errors.assetType && (
                <p className="text-xs text-destructive mt-1">
                  {errors.assetType}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <Label className="text-xs mb-1.5 block">Quantity *</Label>
              <Input
                type="number"
                placeholder="10"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                className={cn(errors.quantity && "border-destructive")}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive mt-1">
                  {errors.quantity}
                </p>
              )}
            </div>

            {/* Avg Buy Price */}
            <div>
              <Label className="text-xs mb-1.5 block">
                Avg Buy Price ($) *
              </Label>
              <Input
                type="number"
                placeholder="150.00"
                min="0"
                step="any"
                value={form.avgBuyPrice}
                onChange={(e) => set("avgBuyPrice", e.target.value)}
                className={cn(errors.avgBuyPrice && "border-destructive")}
              />
              {errors.avgBuyPrice && (
                <p className="text-xs text-destructive mt-1">
                  {errors.avgBuyPrice}
                </p>
              )}
            </div>

            {/* Current Price */}
            <div>
              <Label className="text-xs mb-1.5 block">
                Current Price ($) *
              </Label>
              <Input
                type="number"
                placeholder="175.00"
                min="0"
                step="any"
                value={form.currentPrice}
                onChange={(e) => set("currentPrice", e.target.value)}
                className={cn(errors.currentPrice && "border-destructive")}
              />
              {errors.currentPrice && (
                <p className="text-xs text-destructive mt-1">
                  {errors.currentPrice}
                </p>
              )}
            </div>

            {/* Target Allocation */}
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block">
                Target Allocation (%) *
              </Label>
              <Input
                type="number"
                placeholder="25.0"
                min="0"
                max="100"
                step="any"
                value={form.targetAllocationPct}
                onChange={(e) => set("targetAllocationPct", e.target.value)}
                className={cn(
                  errors.targetAllocationPct && "border-destructive",
                )}
              />
              {errors.targetAllocationPct && (
                <p className="text-xs text-destructive mt-1">
                  {errors.targetAllocationPct}
                </p>
              )}
            </div>
          </div>

          {/* Analytics section — collapsible */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAnalytics((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                {showAnalytics ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                Analytics &amp; Fundamentals
                <span className="text-xs text-muted-foreground font-normal">
                  (optional)
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                Used by Optimizer
              </span>
            </button>
            {showAnalytics && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/5">
                {/* Market Cap */}
                <div>
                  <Label className="text-xs mb-1.5 block">Market Cap ($)</Label>
                  <Input
                    type="number"
                    placeholder="2,800,000,000,000"
                    min="0"
                    step="any"
                    value={form.marketCap}
                    onChange={(e) => set("marketCap", e.target.value)}
                    className={cn(errors.marketCap && "border-destructive")}
                  />
                  {errors.marketCap && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.marketCap}
                    </p>
                  )}
                </div>

                {/* P/E Ratio */}
                <div>
                  <Label className="text-xs mb-1.5 block">P/E Ratio</Label>
                  <Input
                    type="number"
                    placeholder="28.5"
                    min="0"
                    step="any"
                    value={form.peRatio}
                    onChange={(e) => set("peRatio", e.target.value)}
                    className={cn(errors.peRatio && "border-destructive")}
                  />
                  {errors.peRatio && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.peRatio}
                    </p>
                  )}
                </div>

                {/* Sector */}
                <div>
                  <Label className="text-xs mb-1.5 block">Sector</Label>
                  <Select
                    value={form.sector || "__none__"}
                    onValueChange={(v) =>
                      set("sector", v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s.toLowerCase()}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dividend Yield */}
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Dividend Yield (%)
                  </Label>
                  <Input
                    type="number"
                    placeholder="1.5"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.dividendYield}
                    onChange={(e) => set("dividendYield", e.target.value)}
                    className={cn(errors.dividendYield && "border-destructive")}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Enter as percentage e.g. 1.5 for 1.5%
                  </p>
                  {errors.dividendYield && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.dividendYield}
                    </p>
                  )}
                </div>

                {/* Beta */}
                <div>
                  <Label className="text-xs mb-1.5 block">Beta</Label>
                  <Input
                    type="number"
                    placeholder="1.2"
                    step="0.01"
                    value={form.beta}
                    onChange={(e) => set("beta", e.target.value)}
                    className={cn(errors.beta && "border-destructive")}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Market sensitivity (1.0 = market, &gt;1 = higher risk)
                  </p>
                  {errors.beta && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.beta}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="col-span-2">
                  <Label className="text-xs mb-1.5 block">Notes</Label>
                  <Textarea
                    placeholder="Add research notes, investment thesis, or reminders..."
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    className="resize-none min-h-[80px] text-sm"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? mode === "add"
                ? "Adding..."
                : "Saving..."
              : mode === "add"
                ? "Add Asset"
                : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnalyticsPanel({ asset }: { asset: Asset }) {
  const hasAny =
    asset.marketCap !== undefined ||
    asset.peRatio !== undefined ||
    asset.sector !== undefined ||
    asset.dividendYield !== undefined ||
    asset.beta !== undefined ||
    asset.notes !== undefined;

  if (!hasAny) return null;

  return (
    <div className="px-4 pb-3 pt-1">
      <div className="bg-muted/20 rounded-md p-3 border border-border/50">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          {asset.marketCap !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Mkt Cap</span>
              <span className="font-mono font-medium text-foreground">
                {fmtMarketCap(asset.marketCap)}
              </span>
            </div>
          )}
          {asset.peRatio !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">P/E</span>
              <span className="font-mono font-medium text-foreground">
                {fmt(asset.peRatio, 1)}x
              </span>
            </div>
          )}
          {asset.sector !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Sector</span>
              <span className="font-medium text-foreground capitalize">
                {asset.sector}
              </span>
            </div>
          )}
          {asset.dividendYield !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Div Yield</span>
              <span className="font-mono font-medium text-gain">
                {fmt(asset.dividendYield, 2)}%
              </span>
            </div>
          )}
          {asset.beta !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Beta</span>
              <span
                className={cn(
                  "font-mono font-medium",
                  asset.beta > 1.5
                    ? "text-loss"
                    : asset.beta < 0.8
                      ? "text-gain"
                      : "text-foreground",
                )}
              >
                {fmt(asset.beta, 2)}
              </span>
            </div>
          )}
        </div>
        {asset.notes !== undefined && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic border-t border-border/40 pt-2">
            {asset.notes}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Holdings({ portfolioId, portfolio }: HoldingsProps) {
  const assetsQuery = useAssets(portfolioId);
  const assets = assetsQuery.data ?? [];
  const loading = assetsQuery.isLoading;

  const addAsset = useAddAsset();
  const updateAsset = useUpdateAsset();
  const removeAsset = useRemoveAsset();

  const [showAdd, setShowAdd] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async (data: AssetFormData) => {
    if (!portfolioId) return;
    try {
      await addAsset.mutateAsync({
        portfolioId,
        ticker: data.ticker,
        name: data.name,
        assetType: data.assetType,
        quantity: Number.parseFloat(data.quantity),
        avgBuyPrice: Number.parseFloat(data.avgBuyPrice),
        currentPrice: Number.parseFloat(data.currentPrice),
        targetAllocationPct: Number.parseFloat(data.targetAllocationPct),
        marketCap:
          data.marketCap !== "" ? Number.parseFloat(data.marketCap) : null,
        peRatio: data.peRatio !== "" ? Number.parseFloat(data.peRatio) : null,
        sector: data.sector !== "" ? data.sector : null,
        dividendYield:
          data.dividendYield !== ""
            ? Number.parseFloat(data.dividendYield)
            : null,
        beta: data.beta !== "" ? Number.parseFloat(data.beta) : null,
        notes: data.notes !== "" ? data.notes : null,
      });
      toast.success(`${data.ticker} added to portfolio`);
      setShowAdd(false);
    } catch {
      toast.error("Failed to add asset");
    }
  };

  const handleEdit = async (data: AssetFormData) => {
    if (!editAsset || !portfolioId) return;
    try {
      await updateAsset.mutateAsync({
        ...editAsset,
        ticker: data.ticker,
        name: data.name,
        assetType: data.assetType,
        quantity: Number.parseFloat(data.quantity),
        avgBuyPrice: Number.parseFloat(data.avgBuyPrice),
        currentPrice: Number.parseFloat(data.currentPrice),
        targetAllocationPct: Number.parseFloat(data.targetAllocationPct),
        marketCap:
          data.marketCap !== "" ? Number.parseFloat(data.marketCap) : undefined,
        peRatio:
          data.peRatio !== "" ? Number.parseFloat(data.peRatio) : undefined,
        sector: data.sector !== "" ? data.sector : undefined,
        dividendYield:
          data.dividendYield !== ""
            ? Number.parseFloat(data.dividendYield)
            : undefined,
        beta: data.beta !== "" ? Number.parseFloat(data.beta) : undefined,
        notes: data.notes !== "" ? data.notes : undefined,
      });
      toast.success(`${data.ticker} updated`);
      setEditAsset(null);
    } catch {
      toast.error("Failed to update asset");
    }
  };

  const handleDelete = async () => {
    if (!deleteAsset || !portfolioId) return;
    try {
      await removeAsset.mutateAsync({
        portfolioId,
        assetId: deleteAsset.id,
      });
      toast.success(`${deleteAsset.ticker} removed`);
      setDeleteAsset(null);
    } catch {
      toast.error("Failed to remove asset");
    }
  };

  const assetToForm = (a: Asset): AssetFormData => ({
    ticker: a.ticker,
    name: a.name,
    assetType: a.assetType,
    quantity: String(a.quantity),
    avgBuyPrice: String(a.avgBuyPrice),
    currentPrice: String(a.currentPrice),
    targetAllocationPct: String(a.targetAllocationPct),
    marketCap: a.marketCap !== undefined ? String(a.marketCap) : "",
    peRatio: a.peRatio !== undefined ? String(a.peRatio) : "",
    sector: a.sector ?? "",
    dividendYield: a.dividendYield !== undefined ? String(a.dividendYield) : "",
    beta: a.beta !== undefined ? String(a.beta) : "",
    notes: a.notes ?? "",
  });

  const hasAnalytics = (a: Asset) =>
    a.marketCap !== undefined ||
    a.peRatio !== undefined ||
    a.sector !== undefined ||
    a.dividendYield !== undefined ||
    a.beta !== undefined ||
    a.notes !== undefined;

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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold font-display text-foreground">
              Holdings
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {portfolio.name} · {assets.length} asset
              {assets.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowAdd(true)}
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-2">
            {["s1", "s2", "s3", "s4", "s5"].map((k) => (
              <Skeleton key={k} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Package className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No assets yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
              Add your first asset to start tracking your portfolio performance.
            </p>
            <Button
              size="sm"
              onClick={() => setShowAdd(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add First Asset
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="w-8 px-2 py-3" />
                    {[
                      "Ticker",
                      "Name",
                      "Type",
                      "Qty",
                      "Avg Buy",
                      "Current",
                      "Value",
                      "Gain/Loss",
                      "Alloc %",
                      "Target %",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                      >
                        {h ? (
                          <span className="flex items-center gap-1">
                            {h}
                            {[
                              "Qty",
                              "Avg Buy",
                              "Current",
                              "Value",
                              "Gain/Loss",
                            ].includes(h) && (
                              <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                            )}
                          </span>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const value = asset.quantity * asset.currentPrice;
                    const cost = asset.quantity * asset.avgBuyPrice;
                    const gainLoss = value - cost;
                    const gainLossPct = cost > 0 ? (gainLoss / cost) * 100 : 0;
                    const isPositive = gainLoss >= 0;
                    const totalValue = assets.reduce(
                      (sum, a) => sum + a.quantity * a.currentPrice,
                      0,
                    );
                    const allocPct =
                      totalValue > 0 ? (value / totalValue) * 100 : 0;
                    const isStock = asset.assetType.toLowerCase() === "stock";
                    const idStr = asset.id.toString();
                    const isExpanded = expandedIds.has(idStr);
                    const hasInfo = hasAnalytics(asset);

                    return (
                      <>
                        <tr
                          key={`${idStr}-main`}
                          className={cn(
                            "border-b transition-colors group",
                            isExpanded
                              ? "border-border/20 bg-accent/10"
                              : "border-border/50 hover:bg-accent/20",
                          )}
                        >
                          {/* Expand toggle */}
                          <td className="px-2 py-3 w-8">
                            {hasInfo ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(idStr)}
                                className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : (
                              <div className="w-5" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-foreground tracking-wider">
                              {asset.ticker}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">
                            {asset.name}
                          </td>
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3 font-mono tabular text-right text-foreground">
                            {fmt(asset.quantity, 4)}
                          </td>
                          <td className="px-4 py-3 font-mono tabular text-right text-muted-foreground">
                            {fmtCurrency(asset.avgBuyPrice)}
                          </td>
                          <td className="px-4 py-3 font-mono tabular text-right text-foreground">
                            {fmtCurrency(asset.currentPrice)}
                          </td>
                          <td className="px-4 py-3 font-mono tabular text-right font-semibold text-foreground">
                            {fmtCurrency(value)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div
                              className={cn(
                                "font-mono tabular text-sm",
                                isPositive ? "text-gain" : "text-loss",
                              )}
                            >
                              {isPositive ? "+" : ""}
                              {fmtCurrency(gainLoss)}
                            </div>
                            <div
                              className={cn(
                                "font-mono tabular text-xs",
                                isPositive ? "text-gain" : "text-loss",
                              )}
                            >
                              {isPositive ? "+" : ""}
                              {fmt(gainLossPct, 2)}%
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono tabular text-right text-muted-foreground">
                            {fmt(allocPct, 1)}%
                          </td>
                          <td className="px-4 py-3 font-mono tabular text-right text-muted-foreground">
                            {fmt(asset.targetAllocationPct, 1)}%
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                                onClick={() => setEditAsset(asset)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleteAsset(asset)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && hasInfo && (
                          <tr
                            key={`${idStr}-analytics`}
                            className="bg-accent/5 border-b border-border/30"
                          >
                            <td colSpan={12}>
                              <AnalyticsPanel asset={asset} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AssetFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        mode="add"
        onSubmit={handleAdd}
        isPending={addAsset.isPending}
      />

      {/* Edit Modal */}
      {editAsset && (
        <AssetFormDialog
          open={!!editAsset}
          onOpenChange={(v) => !v && setEditAsset(null)}
          mode="edit"
          initialData={assetToForm(editAsset)}
          onSubmit={handleEdit}
          isPending={updateAsset.isPending}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteAsset}
        onOpenChange={(v) => !v && setDeleteAsset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Asset?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{" "}
              <span className="font-semibold text-foreground">
                {deleteAsset?.ticker} ({deleteAsset?.name})
              </span>{" "}
              from your portfolio? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={removeAsset.isPending}
            >
              {removeAsset.isPending ? "Removing..." : "Remove Asset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
