import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Asset, Portfolio } from "../backend.d";
import { useActor } from "./useActor";

export type { Portfolio };

// ── Portfolios ─────────────────────────────────────────────────────────────

export function usePortfolios() {
  const { actor, isFetching } = useActor();
  return useQuery<Portfolio[]>({
    queryKey: ["portfolios"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPortfolios();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePortfolio() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("No actor");
      return actor.createPortfolio(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });
}

export function useRenamePortfolio() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newName }: { id: bigint; newName: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.renamePortfolio(id, newName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });
}

export function useDeletePortfolio() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (portfolioId: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deletePortfolio(portfolioId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });
}

// ── Portfolio Summary ────────────────────────────────────────────────────────

export function usePortfolioSummary(portfolioId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["portfolioSummary", portfolioId?.toString()],
    queryFn: async () => {
      if (!actor || portfolioId === null) return null;
      return actor.getPortfolioSummary(portfolioId);
    },
    enabled: !!actor && !isFetching && portfolioId !== null,
  });
}

// ── Assets ───────────────────────────────────────────────────────────────────

export function useAssets(portfolioId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Asset[]>({
    queryKey: ["assets", portfolioId?.toString()],
    queryFn: async () => {
      if (!actor || portfolioId === null) return [];
      return actor.getAssets(portfolioId);
    },
    enabled: !!actor && !isFetching && portfolioId !== null,
  });
}

export function useAddAsset() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      portfolioId: bigint;
      ticker: string;
      name: string;
      assetType: string;
      quantity: number;
      avgBuyPrice: number;
      currentPrice: number;
      targetAllocationPct: number;
      marketCap?: number | null;
      peRatio?: number | null;
      sector?: string | null;
      dividendYield?: number | null;
      beta?: number | null;
      notes?: string | null;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addAsset(
        params.portfolioId,
        params.ticker,
        params.name,
        params.assetType,
        params.quantity,
        params.avgBuyPrice,
        params.currentPrice,
        params.targetAllocationPct,
        params.marketCap ?? null,
        params.peRatio ?? null,
        params.sector ?? null,
        params.dividendYield ?? null,
        params.beta ?? null,
        params.notes ?? null,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["assets", variables.portfolioId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["portfolioSummary", variables.portfolioId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["rebalance", variables.portfolioId.toString()],
      });
    },
  });
}

export function useUpdateAsset() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (asset: Asset) => {
      if (!actor) throw new Error("No actor");
      return actor.updateAsset(asset);
    },
    onSuccess: (_data, asset) => {
      queryClient.invalidateQueries({
        queryKey: ["assets", asset.portfolioId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["portfolioSummary", asset.portfolioId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["rebalance", asset.portfolioId.toString()],
      });
    },
  });
}

export function useRemoveAsset() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      portfolioId,
      assetId,
    }: {
      portfolioId: bigint;
      assetId: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.removeAsset(portfolioId, assetId);
    },
    onSuccess: (_data, { portfolioId }) => {
      queryClient.invalidateQueries({
        queryKey: ["assets", portfolioId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["portfolioSummary", portfolioId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["rebalance", portfolioId.toString()],
      });
    },
  });
}

// ── Rebalance ────────────────────────────────────────────────────────────────

export function useRebalanceSuggestions(portfolioId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["rebalance", portfolioId?.toString()],
    queryFn: async () => {
      if (!actor || portfolioId === null) return [];
      return actor.getRebalanceSuggestions(portfolioId);
    },
    enabled: !!actor && !isFetching && portfolioId !== null,
  });
}

// ── Live Price Refresh ───────────────────────────────────────────────────────

const CRYPTO_TICKER_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  DOGE: "dogecoin",
  XRP: "ripple",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  BNB: "binancecoin",
  ATOM: "cosmos",
  NEAR: "near",
  ALGO: "algorand",
  XLM: "stellar",
};

export const STOCK_API_KEY_STORAGE = "portfolio-stock-api-key";

export function useRefreshPrices() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      portfolioId,
      assets,
    }: {
      portfolioId: bigint;
      assets: Asset[];
    }) => {
      if (!actor) throw new Error("No actor");

      const cryptoAssets = assets.filter(
        (a) => a.assetType.toLowerCase() === "crypto",
      );

      const priceMap: Record<string, number> = {};

      // Fetch crypto prices in a single batch
      if (cryptoAssets.length > 0) {
        const knownCryptoAssets = cryptoAssets.filter(
          (a) => CRYPTO_TICKER_MAP[a.ticker.toUpperCase()],
        );
        if (knownCryptoAssets.length > 0) {
          const coinIds = knownCryptoAssets
            .map((a) => CRYPTO_TICKER_MAP[a.ticker.toUpperCase()])
            .join(",");
          try {
            const res = await fetch(
              `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`,
            );
            if (res.ok) {
              const data: Record<string, { usd: number }> = await res.json();
              for (const asset of knownCryptoAssets) {
                const coinId = CRYPTO_TICKER_MAP[asset.ticker.toUpperCase()];
                if (data[coinId]?.usd) {
                  priceMap[asset.ticker.toUpperCase()] = data[coinId].usd;
                }
              }
            }
          } catch {
            // silently skip on network error
          }
        }
      }

      // Fetch stock/ETF/fixed-income prices
      const stockApiKey = localStorage.getItem(STOCK_API_KEY_STORAGE);

      const exchangeAssets = assets.filter((a) => {
        const t = a.assetType.toLowerCase();
        return t === "stock" || t === "etf" || t === "fixed_income";
      });

      if (exchangeAssets.length > 0) {
        const assetsNeedingPrice = exchangeAssets.filter(
          (a) => priceMap[a.ticker.toUpperCase()] === undefined,
        );

        if (stockApiKey) {
          const finnhubFetches = assetsNeedingPrice.map(async (asset) => {
            try {
              const res = await fetch(
                `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(asset.ticker)}&token=${stockApiKey}`,
              );
              if (res.ok) {
                const data: { c: number } = await res.json();
                if (data.c && data.c > 0) {
                  priceMap[asset.ticker.toUpperCase()] = data.c;
                }
              }
            } catch {
              // silently skip on error
            }
          });
          await Promise.all(finnhubFetches);
        }

        const stillMissing = assetsNeedingPrice.filter(
          (a) => priceMap[a.ticker.toUpperCase()] === undefined,
        );
        if (stillMissing.length > 0) {
          const yahooFetches = stillMissing.map(async (asset) => {
            try {
              const res = await fetch(
                `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.ticker)}?interval=1d&range=1d`,
                { headers: { Accept: "application/json" } },
              );
              if (res.ok) {
                const data: {
                  chart?: {
                    result?: Array<{
                      meta?: { regularMarketPrice?: number };
                    }>;
                  };
                } = await res.json();
                const price =
                  data?.chart?.result?.[0]?.meta?.regularMarketPrice;
                if (price && price > 0) {
                  priceMap[asset.ticker.toUpperCase()] = price;
                }
              }
            } catch {
              // silently skip on error
            }
          });
          await Promise.all(yahooFetches);
        }
      }

      const updates = assets
        .filter((a) => priceMap[a.ticker.toUpperCase()] !== undefined)
        .map((a) =>
          actor.updateAsset({
            ...a,
            currentPrice: priceMap[a.ticker.toUpperCase()],
          }),
        );

      await Promise.all(updates);

      queryClient.invalidateQueries({
        queryKey: ["assets", portfolioId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["portfolioSummary", portfolioId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["rebalance", portfolioId.toString()],
      });

      return { updatedCount: updates.length, priceMap };
    },
    onSuccess: () => {
      setLastRefreshed(new Date());
    },
  });

  return {
    refresh: mutation.mutateAsync,
    isRefreshing: mutation.isPending,
    lastRefreshed,
  };
}

// ── Profile Rebalance Suggestions ────────────────────────────────────────────

export function useProfileRebalanceSuggestions(
  portfolioId: bigint | null,
  marketCondition: string,
  riskProfile: string,
) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: [
      "profileRebalance",
      portfolioId?.toString(),
      marketCondition,
      riskProfile,
    ],
    queryFn: async () => {
      if (!actor || portfolioId === null) return [];
      return actor.getProfileRebalanceSuggestions(
        portfolioId,
        marketCondition,
        riskProfile,
      );
    },
    enabled: !!actor && !isFetching && portfolioId !== null,
  });
}
