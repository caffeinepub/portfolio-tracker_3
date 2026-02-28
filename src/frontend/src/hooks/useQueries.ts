import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
