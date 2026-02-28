import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Portfolio } from "./backend.d";
import Dashboard from "./components/Dashboard";
import Holdings from "./components/Holdings";
import Optimizer from "./components/Optimizer";
import Rebalance from "./components/Rebalance";
import Sidebar from "./components/Sidebar";
import { useActor } from "./hooks/useActor";
import {
  useCreatePortfolio,
  useDeletePortfolio,
  usePortfolios,
} from "./hooks/useQueries";

export type ActiveView = "dashboard" | "holdings" | "rebalance" | "optimizer";

export default function App() {
  const { actor, isFetching: actorLoading } = useActor();
  const [initialized, setInitialized] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<bigint | null>(
    null,
  );

  // Initialize backend on first actor load
  useEffect(() => {
    if (actor && !initialized && !actorLoading) {
      actor
        .initialize()
        .then(() => {
          setInitialized(true);
        })
        .catch(() => {
          setInitialized(true); // continue even if fails
        });
    }
  }, [actor, actorLoading, initialized]);

  const portfoliosQuery = usePortfolios();
  const portfolios = portfoliosQuery.data ?? [];

  // Auto-select first portfolio
  useEffect(() => {
    if (portfolios.length > 0 && selectedPortfolioId === null) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolioId]);

  // If selected portfolio was deleted, pick next one
  useEffect(() => {
    if (portfolios.length > 0 && selectedPortfolioId !== null) {
      const exists = portfolios.some((p) => p.id === selectedPortfolioId);
      if (!exists) {
        setSelectedPortfolioId(portfolios[0].id);
      }
    }
    if (portfolios.length === 0) {
      setSelectedPortfolioId(null);
    }
  }, [portfolios, selectedPortfolioId]);

  const createPortfolio = useCreatePortfolio();
  const deletePortfolio = useDeletePortfolio();

  const selectedPortfolio: Portfolio | undefined = portfolios.find(
    (p) => p.id === selectedPortfolioId,
  );

  const handleCreatePortfolio = async (name: string) => {
    try {
      const newId = await createPortfolio.mutateAsync(name);
      setSelectedPortfolioId(newId);
      toast.success(`Portfolio "${name}" created`);
    } catch {
      toast.error("Failed to create portfolio");
    }
  };

  const handleDeletePortfolio = async (portfolioId: bigint) => {
    const portfolio = portfolios.find((p) => p.id === portfolioId);
    try {
      await deletePortfolio.mutateAsync(portfolioId);
      toast.success(`Portfolio "${portfolio?.name}" deleted`);
    } catch {
      toast.error("Failed to delete portfolio");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        portfolios={portfolios}
        selectedPortfolio={selectedPortfolio}
        onSelectPortfolio={setSelectedPortfolioId}
        onCreatePortfolio={handleCreatePortfolio}
        onDeletePortfolio={handleDeletePortfolio}
        isCreating={createPortfolio.isPending}
        isDeleting={deletePortfolio.isPending}
        isLoading={portfoliosQuery.isLoading || actorLoading || !initialized}
      />

      <main className="flex-1 overflow-hidden flex flex-col">
        {activeView === "dashboard" && (
          <Dashboard
            portfolioId={selectedPortfolioId}
            portfolio={selectedPortfolio}
          />
        )}
        {activeView === "holdings" && (
          <Holdings
            portfolioId={selectedPortfolioId}
            portfolio={selectedPortfolio}
          />
        )}
        {activeView === "rebalance" && (
          <Rebalance
            portfolioId={selectedPortfolioId}
            portfolio={selectedPortfolio}
          />
        )}
        {activeView === "optimizer" && (
          <Optimizer
            portfolioId={selectedPortfolioId}
            portfolio={selectedPortfolio}
          />
        )}
      </main>

      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "oklch(0.18 0.012 240)",
            border: "1px solid oklch(0.28 0.015 240)",
            color: "oklch(0.92 0.01 240)",
          },
        }}
      />
    </div>
  );
}
