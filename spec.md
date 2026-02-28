# Portfolio Tracker

## Current State
A full-stack portfolio tracker with Motoko backend and React frontend. Users can manage portfolios and assets, view dashboards, rebalance, and use an optimizer. The backend stores portfolios and assets per user, with analytics fields (marketCap, peRatio, sector, dividendYield, beta, notes).

## Requested Changes (Diff)

### Add
- Nothing new to add

### Modify
- Fix `getAssets`: currently traps with "No assets found for user" when a new portfolio is created but has no assets yet. Should return an empty array `[]` instead of trapping.
- Fix `getPortfolioSummary`: same issue -- should return an empty summary instead of trapping when no assets exist for a new portfolio.
- Fix `getRebalanceSuggestions`: same issue -- should return `[]` instead of trapping.
- Fix `getProfileRebalanceSuggestions`: same issue -- should return `[]` instead of trapping.

### Remove
- Nothing

## Implementation Plan
1. In `getAssets`, `getPortfolioSummary`, `getRebalanceSuggestions`, and `getProfileRebalanceSuggestions`: when `userAssets.get(caller)` returns `null` or the portfolioId key is not found, return an empty result instead of trapping. First verify the portfolio exists (via `userPortfolios`), then gracefully return empty data for the assets layer.
