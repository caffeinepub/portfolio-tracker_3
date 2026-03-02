# Portfolio Tracker

## Current State

- **Analytics tab** (`Analytics.tsx`): Shows risk metrics (Sharpe, Sortino, Beta, VaR, P/E), factor exposure cards, a sector concentration bar chart, a correlation matrix heatmap, and an efficient frontier scatter plot.
- **Charts tab** (`Charts.tsx`): Shows 5 portfolio-level charts: Portfolio Allocation (donut), Gain/Loss by Asset (horizontal bar), Market Value vs Cost Basis (grouped bar), Asset Class Split (donut), and Sector Concentration (horizontal bar).

## Requested Changes (Diff)

### Add
- In **Analytics tab**: Add all 5 portfolio-level charts currently in Charts.tsx — Portfolio Allocation donut, Gain/Loss by Asset, Value vs Cost Basis, Asset Class Split donut, and Sector Concentration bar — as a new "Portfolio Charts" section after the existing analytics sections.
- In **Charts tab**: Replace current content with per-asset price history charts. Each asset in the portfolio gets its own chart card. Each card has a toggle to switch between **Line** and **Candlestick** chart types. Price history is simulated (generated deterministically from asset data) since there is no historical price API. Display at least 30 data points of simulated daily OHLCV data. Each asset card shows the asset ticker as the title.

### Modify
- `Analytics.tsx`: Import and embed the chart components/logic from Charts.tsx at the bottom of the Analytics content area (new section labeled "Portfolio Charts").
- `Charts.tsx`: Replace all existing chart content with a per-asset chart grid. Each asset card has a Line/Candlestick toggle. Use recharts for rendering; for candlestick use a custom recharts shape since recharts doesn't have a native candlestick. Simulate OHLCV price data deterministically using the asset's ticker and current price as a seed.

### Remove
- Remove the original 5 portfolio-level charts from the Charts tab (they move to Analytics).

## Implementation Plan

1. **Analytics.tsx**: Add a new "Portfolio Charts" section at the bottom of the analytics content (before the methodology note). Copy the chart rendering logic from Charts.tsx into Analytics.tsx — the data computations (allocationData, gainLossData, etc.) and the chart JSX. Import `useCurrency` hook. Add all necessary recharts imports.

2. **Charts.tsx**: Rewrite the main content area to render one card per asset. 
   - Fetch assets via `useAssets(portfolioId)`.
   - Generate simulated OHLCV data (30+ daily points) for each asset deterministically using the asset ticker + current price.
   - Each card: title = asset ticker + name, toggle buttons for Line / Candlestick.
   - Line chart: recharts `LineChart` with closing price.
   - Candlestick: recharts `ComposedChart` with custom bar shapes rendering open/high/low/close as a candle (body + wick).
   - State: per-asset chart type toggle stored in a `Record<string, 'line' | 'candle'>` state.
