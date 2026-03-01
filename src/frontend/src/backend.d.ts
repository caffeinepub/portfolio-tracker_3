import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PortfolioSummary {
    totalGainLossPct: number;
    totalMarketValue: number;
    assets: Array<AssetBreakdown>;
    totalGainLoss: number;
    totalCostBasis: number;
}
export interface ProfileRebalanceSuggestion {
    suggestedTargetPct: number;
    asset: Asset;
    rationale: string;
}
export interface Portfolio {
    id: bigint;
    name: string;
    createdAt: bigint;
}
export interface RebalanceSuggestion {
    suggestedAmount: number;
    allocationDiffPct: number;
    asset: Asset;
    targetAllocationPct: number;
    currentValue: number;
    currentAllocationPct: number;
}
export interface Asset {
    id: bigint;
    portfolioId: bigint;
    peRatio?: number;
    currentPrice: number;
    ticker: string;
    targetAllocationPct: number;
    marketCap?: number;
    beta?: number;
    name: string;
    sector?: string;
    notes?: string;
    quantity: number;
    assetType: string;
    dividendYield?: number;
    avgBuyPrice: number;
}
export interface AssetBreakdown {
    gainLossPct: number;
    asset: Asset;
    value: number;
    cost: number;
    gainLoss: number;
    actualAllocationPct: number;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAsset(portfolioId: bigint, ticker: string, name: string, assetType: string, quantity: number, avgBuyPrice: number, currentPrice: number, targetAllocationPct: number, marketCap: number | null, peRatio: number | null, sector: string | null, dividendYield: number | null, beta: number | null, notes: string | null): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createPortfolio(name: string): Promise<bigint>;
    deletePortfolio(id: bigint): Promise<void>;
    getAssets(portfolioId: bigint): Promise<Array<Asset>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPortfolioSummary(portfolioId: bigint): Promise<PortfolioSummary>;
    getPortfolios(): Promise<Array<Portfolio>>;
    getProfileRebalanceSuggestions(portfolioId: bigint, marketCondition: string, riskProfile: string): Promise<Array<ProfileRebalanceSuggestion>>;
    getRebalanceSuggestions(portfolioId: bigint): Promise<Array<RebalanceSuggestion>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initialize(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    removeAsset(portfolioId: bigint, assetId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateAsset(asset: Asset): Promise<void>;
}
