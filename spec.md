# Portfolio Tracker

## Current State
Full-stack portfolio tracker with:
- Backend: Motoko canister storing portfolios and assets with fields including beta, P/E ratio, sector, dividend yield, market cap, notes
- Frontend: Dashboard (allocation charts, summary cards), Holdings (add/edit/delete assets, analytics panel), Rebalance (target allocation suggestions), Optimizer (Bull/Bear + Aggressive/Balanced/Conservative profile rebalancing), Settings (currency toggle, API key)
- Live price refresh via CoinGecko (crypto) and Finnhub (stocks)
- Currency display: USD, CAD, EUR, GBP, JPY, PHP

## Requested Changes (Diff)

### Add
- **Analytics page** (new tab in sidebar): dedicated page showing portfolio-level risk and performance metrics
  - **Sharpe Ratio**: computed client-side from asset returns and volatility proxy using beta and gain/loss
  - **Sortino Ratio**: downside-only volatility version of Sharpe
  - **Portfolio Beta**: weighted average beta across all assets
  - **Maximum Drawdown**: estimated from cost basis vs current value per asset, showing worst unrealized drawdown
  - **Value at Risk (VaR) 95%**: parametric VaR estimate based on portfolio volatility
  - **Correlation Matrix**: heatmap of pairwise sector/type correlation across assets
  - **Asset Class Risk Breakdown**: bar chart showing risk contribution by sector and asset type
  - **Factor Exposure cards**: Value (avg P/E), Growth (avg beta), Dividend Income (avg yield), Volatility
  - **Efficient Frontier visualization**: 2D scatter plot showing risk vs return tradeoffs for different allocation scenarios

- **New backend query**: `getAnalytics(portfolioId)` returning pre-computed portfolio-level metrics: weightedBeta, totalVolatility, estimatedVar95, maxDrawdown, sharpeRatio, sortinoRatio, sectorConcentration

### Modify
- **Sidebar**: add "Analytics" tab between Optimizer and Settings with a chart/activity icon
- **App.tsx**: add `analytics` to `ActiveView` type and render `<Analytics>` component
- **Holdings form**: add PEG Ratio, Price-to-Book (P/B), Debt-to-Equity (D/E), ROE, Free Cash Flow Yield fields to the Analytics & Fundamentals collapsible section
- **Asset type**: add new optional fields: `pegRatio`, `priceToBook`, `debtToEquity`, `roe`, `freeCashFlowYield` to the Asset record in backend

### Remove
- Nothing removed

## Implementation Plan
1. Update `Asset` type in `main.mo` to add 5 new optional fields (pegRatio, priceToBook, debtToEquity, roe, freeCashFlowYield)
2. Add `PortfolioAnalytics` return type and `getAnalytics` query function in backend
3. Update `addAsset` and `updateAsset` backend functions to accept new fields
4. Update `initialize` seed data to include sample values for new fields
5. Regenerate `backend.d.ts` with new types
6. Add `useAnalytics` hook to `useQueries.ts`
7. Create `Analytics.tsx` component with:
   - Summary metric cards (Sharpe, Sortino, Beta, VaR, Max Drawdown)
   - Sector concentration bar chart using recharts
   - Correlation matrix heatmap (sector/type cross-tab)
   - Efficient Frontier scatter using mock simulated allocations
   - Factor exposure cards (Value, Growth, Income, Volatility)
8. Update `Holdings.tsx` form to add 5 new optional analytics fields
9. Update `App.tsx` to include `analytics` view
10. Update `Sidebar.tsx` to show Analytics nav item
