import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Portfolio } from "./backend.d";
import Dashboard from "./components/Dashboard";
import Holdings from "./components/Holdings";
import Optimizer from "./components/Optimizer";
import Rebalance from "./components/Rebalance";
import Settings from "./components/Settings";
import Sidebar from "./components/Sidebar";
import { useActor } from "./hooks/useActor";
import { CurrencyProvider } from "./hooks/useCurrency";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useCreatePortfolio,
  useDeletePortfolio,
  usePortfolios,
} from "./hooks/useQueries";

export type ActiveView =
  | "dashboard"
  | "holdings"
  | "rebalance"
  | "optimizer"
  | "settings";

function LoginScreen() {
  const { login, isInitializing, isLoggingIn } = useInternetIdentity();
  const isLoading = isInitializing || isLoggingIn;

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      {/* Background atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.35 0.08 240 / 0.4), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-64 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 100%, oklch(0.4 0.1 260 / 0.5), transparent 70%)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-8 px-8 text-center max-w-sm w-full"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.45 0.15 240), oklch(0.35 0.1 260))",
              boxShadow:
                "0 0 40px oklch(0.45 0.15 240 / 0.3), inset 0 1px 0 oklch(0.7 0.1 240 / 0.2)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8"
              fill="none"
              stroke="oklch(0.92 0.05 240)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              role="img"
              aria-label="Portfolio trend chart"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
              PortfolioOS
            </h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Professional asset tracking &amp; portfolio optimization
            </p>
          </div>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="w-full h-px bg-border"
        />

        {/* Login section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-col items-center gap-4 w-full"
        >
          <p className="text-xs text-muted-foreground">
            Sign in to access your portfolios
          </p>
          <Button
            onClick={login}
            disabled={isLoading}
            className="w-full h-11 text-sm font-medium gap-2"
            style={{
              background: isLoading
                ? undefined
                : "linear-gradient(135deg, oklch(0.5 0.15 240), oklch(0.42 0.12 260))",
            }}
          >
            {isLoading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  role="img"
                  aria-label="Loading"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {isInitializing ? "Loading..." : "Connecting..."}
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  role="img"
                  aria-label="User identity"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20v-2a6 6 0 0112 0v2" />
                  <path d="M15 11l2 2 4-4" />
                </svg>
                Connect with Internet Identity
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
            Secure, passwordless authentication via the Internet Computer
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorLoading } = useActor();

  // Show login screen if not authenticated or still initializing
  if (isInitializing) {
    return <LoginScreen />;
  }

  if (!identity) {
    return <LoginScreen />;
  }

  return (
    <CurrencyProvider>
      <AuthenticatedApp actor={actor} actorLoading={actorLoading} />
    </CurrencyProvider>
  );
}

function AuthenticatedApp({
  actor,
  actorLoading,
}: {
  actor: ReturnType<typeof useActor>["actor"];
  actorLoading: boolean;
}) {
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
        {activeView === "settings" && <Settings />}
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
