import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Bitcoin,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { STOCK_API_KEY_STORAGE } from "../hooks/useQueries";

const SUPPORTED_CRYPTO = [
  "BTC",
  "ETH",
  "SOL",
  "ADA",
  "DOT",
  "AVAX",
  "MATIC",
  "LINK",
  "UNI",
  "DOGE",
  "XRP",
  "LTC",
  "BCH",
  "BNB",
  "ATOM",
  "NEAR",
  "ALGO",
  "XLM",
];

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Load saved key from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STOCK_API_KEY_STORAGE);
    setSavedKey(stored);
    if (stored) setApiKey(stored);
  }, []);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error("Please enter a valid API key");
      return;
    }
    localStorage.setItem(STOCK_API_KEY_STORAGE, trimmed);
    setSavedKey(trimmed);
    toast.success("Finnhub API key saved");
  };

  const handleClear = () => {
    localStorage.removeItem(STOCK_API_KEY_STORAGE);
    setSavedKey(null);
    setApiKey("");
    toast.info("API key removed");
  };

  const isConnected = !!savedKey;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold font-display text-foreground">
            Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure price data sources and API connections
          </p>
        </div>
      </div>

      <div className="px-6 py-6 max-w-2xl space-y-6">
        {/* Stock Price API Key */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Key className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Stock Price API Key
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs gap-1.5",
                  isConnected
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/8"
                    : "border-muted-foreground/30 text-muted-foreground bg-muted/30",
                )}
              >
                {isConnected ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {isConnected ? "Connected" : "Not configured"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect a Finnhub API key to enable live stock price updates.
              Stock quotes will be fetched directly in your browser when you
              click "Refresh Prices."
            </p>
            <a
              href="https://finnhub.io"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Get a free API key at finnhub.io
            </a>

            <Separator className="my-2" />

            <div className="space-y-2">
              <Label htmlFor="finnhub-key" className="text-sm font-medium">
                Finnhub API Key
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="finnhub-key"
                    type={showKey ? "text" : "password"}
                    placeholder="Enter your Finnhub API key…"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                    }}
                    className="pr-10 font-mono text-sm"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showKey ? "Hide API key" : "Show API key"}
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <Button
                  onClick={handleSave}
                  className="shrink-0"
                  disabled={!apiKey.trim()}
                >
                  Save Key
                </Button>
                {isConnected && (
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-border"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your API key is stored locally in your browser and never sent to
                our servers.
              </p>
            </div>

            {isConnected && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-500/8 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-400/90 leading-relaxed">
                  Finnhub is connected. Stock prices will be updated when you
                  click "Refresh Prices" on the Dashboard or Holdings page.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Crypto Prices */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Bitcoin className="w-4 h-4 text-amber-400" />
              </div>
              <CardTitle className="text-base font-semibold text-foreground">
                Crypto Prices
              </CardTitle>
              <Badge
                variant="outline"
                className="text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/8 gap-1.5 ml-auto"
              >
                <CheckCircle2 className="w-3 h-3" />
                Always on
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Crypto prices are fetched from{" "}
              <a
                href="https://coingecko.com"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                CoinGecko's free public API
              </a>
              . No API key required — just click "Refresh Prices" on any page.
            </p>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Supported Tickers
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUPPORTED_CRYPTO.map((ticker) => (
                  <span
                    key={ticker}
                    className="text-xs font-mono font-semibold px-2 py-1 rounded bg-muted/50 border border-border/50 text-foreground"
                  >
                    {ticker}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Assets with tickers not in this list will not have their prices
                auto-updated.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
