# Portfolio Tracker

## Current State
Full-stack ICP app with Motoko backend and React frontend. Features:
- Internet Identity login gate
- Multi-portfolio management (create, delete)
- Asset management per portfolio (add, edit, remove) with analytics fields (marketCap, P/E ratio, sector, dividendYield, beta, notes)
- Dashboard with portfolio summary, allocation charts
- Rebalance tab with suggestions based on target allocation %
- Optimizer tab with Bull/Bear market condition + Aggressive/Balanced/Conservative risk profiles

Prices are all manually entered (`currentPrice` field on Asset). No live price data exists.

## Requested Changes (Diff)

### Add
- **Backend**: HTTP outcall to CoinGecko free API to fetch live prices for crypto assets (BTC, ETH, SOL, etc.) by ticker symbol. Map common crypto tickers to CoinGecko IDs.
- **Backend**: Per-user storage of a stock price API key (e.g. Finnhub or Alpha Vantage). `saveStockApiKey(key: Text)` and `getStockApiKey()` functions.
- **Backend**: HTTP outcall to Finnhub stock API using the user's stored API key to fetch live prices for stock assets.
- **Backend**: `refreshPrices(portfolioId: Nat)` shared function that fetches live prices for all assets in a portfolio (crypto via CoinGecko, stocks via Finnhub if API key is set), and updates `currentPrice` on each asset in-place.
- **Backend**: `getLastPriceRefresh(portfolioId: Nat)` query that returns the last timestamp (Int, nanoseconds) when prices were refreshed for that portfolio, or null.
- **Frontend**: "Refresh Prices" button on Holdings and/or Dashboard page that calls `refreshPrices`, shows a loading spinner, and updates the UI on completion.
- **Frontend**: Last-updated timestamp displayed near the Refresh button showing how fresh the data is.
- **Frontend**: Settings section (or modal) where the user can enter and save their stock price API key. Show a placeholder/hint that it's for Finnhub. Key is stored per-user in the backend.

### Modify
- **Backend**: After `refreshPrices` updates prices, the existing `getPortfolioSummary` and `getAssets` queries will automatically return the updated prices (no change needed to those functions -- prices are stored on the Asset record).

### Remove
- Nothing removed.

## Implementation Plan
1. Add `http-outcalls` Caffeine component (enables `ExperimentalInternetComputer.http_request` in Motoko).
2. Regenerate Motoko backend with:
   - `userStockApiKey` map (Principal → Text) for storing API keys
   - `lastPriceRefresh` map (Principal → Map<Nat, Int>) for per-portfolio refresh timestamps
   - `saveStockApiKey` / `getStockApiKey` shared/query functions
   - `getLastPriceRefresh` query function
   - `refreshPrices` shared function: iterates assets, calls CoinGecko for crypto, calls Finnhub for stocks (if key present), updates asset currentPrice
   - CoinGecko ticker-to-ID mapping (BTC→bitcoin, ETH→ethereum, SOL→solana, ADA→cardano, DOT→polkadot, AVAX→avalanche-2, MATIC→matic-network, LINK→chainlink, UNI→uniswap, DOGE→dogecoin, XRP→ripple, LTC→litecoin, BCH→bitcoin-cash)
3. Update frontend:
   - Add "Refresh Prices" button to Holdings and Dashboard pages
   - Show loading state during refresh
   - Display "Last updated: X minutes ago" or similar near the button
   - Add a Settings page or modal with a stock API key input field (labeled for Finnhub), save button, and confirmation toast
   - Show a note that crypto prices use CoinGecko (free, no key needed) and stock prices require a Finnhub API key
