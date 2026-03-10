import Map "mo:core/Map";
import Array "mo:core/Array";
import Float "mo:core/Float";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";



actor {
  module Portfolio {
    public type Portfolio = {
      id : Nat;
      name : Text;
      createdAt : Int;
    };

    public func compare(a : Portfolio, b : Portfolio) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };
  type Portfolio = Portfolio.Portfolio;

  module Asset {
    public type Asset = {
      id : Nat;
      portfolioId : Nat;
      ticker : Text;
      name : Text;
      assetType : Text;
      quantity : Float;
      avgBuyPrice : Float;
      currentPrice : Float;
      targetAllocationPct : Float;
      marketCap : ?Float;
      peRatio : ?Float;
      sector : ?Text;
      dividendYield : ?Float;
      beta : ?Float;
      notes : ?Text;
    };

    public func compare(a : Asset, b : Asset) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };
  type Asset = Asset.Asset;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
  };

  type PortfolioSummary = {
    totalMarketValue : Float;
    totalCostBasis : Float;
    totalGainLoss : Float;
    totalGainLossPct : Float;
    assets : [AssetBreakdown];
  };

  type AssetBreakdown = {
    asset : Asset;
    value : Float;
    cost : Float;
    gainLoss : Float;
    gainLossPct : Float;
    actualAllocationPct : Float;
  };

  type RebalanceSuggestion = {
    asset : Asset;
    currentValue : Float;
    currentAllocationPct : Float;
    targetAllocationPct : Float;
    allocationDiffPct : Float;
    suggestedAmount : Float;
  };

  type ProfileRebalanceSuggestion = {
    asset : Asset;
    suggestedTargetPct : Float;
    rationale : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let userPortfolios = Map.empty<Principal, Map.Map<Nat, Portfolio>>();
  let userAssets = Map.empty<Principal, Map.Map<Nat, Map.Map<Nat, Asset>>>();
  let nextPortfolioId = Map.empty<Principal, Nat>();
  let nextAssetId = Map.empty<Principal, Map.Map<Nat, Nat>>();

  func validateNotAnonymous(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthenticated: Anonymous users are not allowed");
    };
  };

  func verifyPortfolioOwnershipSync(caller : Principal, id : Nat) : Bool {
    switch (userPortfolios.get(caller)) {
      case (null) { false };
      case (?p) { p.containsKey(id) };
    };
  };

  func calculatePortfolioSummary(assets : [Asset]) : PortfolioSummary {
    let totalMarketValue = assets.foldLeft(
      0.0,
      func(acc, asset) {
        acc + (asset.quantity * asset.currentPrice);
      },
    );
    let totalCostBasis = assets.foldLeft(
      0.0,
      func(acc, asset) {
        acc + (asset.quantity * asset.avgBuyPrice);
      },
    );

    let assetBreakdowns = assets.map(
      func(asset) {
        let value = asset.quantity * asset.currentPrice;
        let cost = asset.quantity * asset.avgBuyPrice;
        let gainLoss = value - cost;
        let gainLossPct = if (cost == 0.0) { 0.0 } else { (gainLoss / cost) * 100.0 };
        let actualAllocationPct = if (totalMarketValue == 0.0) {
          0.0;
        } else { (value / totalMarketValue) * 100.0 };
        {
          asset;
          value;
          cost;
          gainLoss;
          gainLossPct;
          actualAllocationPct;
        };
      }
    );

    {
      totalMarketValue;
      totalCostBasis;
      totalGainLoss = totalMarketValue - totalCostBasis;
      totalGainLossPct = if (totalCostBasis == 0.0) { 0.0 } else {
        let gain = totalMarketValue - totalCostBasis;
        if (gain <= 0.0) { 0.0 } else {
          (gain / totalCostBasis) * 100.0;
        };
      };
      assets = assetBreakdowns;
    };
  };

  func rebalanceSuggestions(assets : [Asset], totalMarketValue : Float) : [RebalanceSuggestion] {
    assets.map(
      func(asset) {
        let currentValue = asset.quantity * asset.currentPrice;
        let currentAllocationPct = if (totalMarketValue == 0.0) { 0.0 } else {
          (currentValue / totalMarketValue) * 100.0;
        };
        let allocationDiffPct = asset.targetAllocationPct - currentAllocationPct;
        let suggestedAmount = totalMarketValue * (allocationDiffPct / 100.0);

        {
          asset;
          currentValue;
          currentAllocationPct;
          targetAllocationPct = asset.targetAllocationPct;
          allocationDiffPct;
          suggestedAmount;
        };
      }
    );
  };

  func calculateProfileRebalanceSuggestions(
    assets : [Asset],
    marketCondition : Text,
    riskProfile : Text,
  ) : [ProfileRebalanceSuggestion] {
    if (marketCondition != "bull" and marketCondition != "bear") {
      Runtime.trap("Invalid market condition - must be 'bull' or 'bear'");
    };

    if (riskProfile != "aggressive" and riskProfile != "balanced" and riskProfile != "conservative") {
      Runtime.trap("Invalid risk profile - must be 'aggressive', 'balanced', or 'conservative'");
    };

    assets.map(
      func(asset) {
        let beta = switch (asset.beta) {
          case (null) { 1.0 };
          case (?b) { b };
        };
        let assetType = asset.assetType;
        let sector = switch (asset.sector) {
          case (null) { "" };
          case (?s) { s };
        };

        let suggestedTargetPct = switch (riskProfile, marketCondition) {
          case ("aggressive", "bull") {
            if (assetType == "crypto") { asset.targetAllocationPct * 1.25 } else if (switch (asset.beta) { case (?b) { b > 1.2 }; case (null) { false } }) {
              asset.targetAllocationPct * 1.15;
            } else { asset.targetAllocationPct };
          };
          case ("aggressive", "bear") {
            if (assetType == "crypto") { asset.targetAllocationPct * 0.6 } else if (switch (asset.beta) { case (?b) { b > 1.2 }; case (null) { false } }) {
              asset.targetAllocationPct * 0.8;
            } else { asset.targetAllocationPct };
          };
          case ("balanced", "bull") {
            if (assetType == "crypto") { asset.targetAllocationPct * 1.1 } else if (switch (asset.beta) { case (?b) { b > 1.2 }; case (null) { false } }) {
              asset.targetAllocationPct * 1.05;
            } else { asset.targetAllocationPct };
          };
          case ("balanced", "bear") {
            if (assetType == "crypto") {
              asset.targetAllocationPct * 0.8;
            } else if (sector == "technology" or sector == "crypto") {
              asset.targetAllocationPct * 0.9;
            } else {
              asset.targetAllocationPct;
            };
          };
          case ("conservative", "bull") {
            if (assetType == "crypto") {
              asset.targetAllocationPct * 0.85;
            } else if (sector == "technology" or sector == "crypto") {
              asset.targetAllocationPct * 0.9;
            } else if (
              switch (asset.dividendYield) {
                case (null) { false };
                case (?d) { d > 0.02 };
              }
            ) {
              asset.targetAllocationPct * 1.1;
            } else { asset.targetAllocationPct };
          };
          case ("conservative", "bear") {
            if (assetType == "crypto") {
              asset.targetAllocationPct * 0.25;
            } else if (sector == "technology" or sector == "crypto") {
              asset.targetAllocationPct * 0.5;
            } else if (
              switch (asset.dividendYield) {
                case (null) { false };
                case (?d) { d > 0.02 };
              }
            ) {
              asset.targetAllocationPct * 1.1;
            } else { asset.targetAllocationPct };
          };
          case (_) { asset.targetAllocationPct };
        };

        let rationale = switch (riskProfile, marketCondition) {
          case ("aggressive", "bull") {
            if (assetType == "crypto") {
              "Higher allocation to risky assets";
            } else if (switch (asset.beta) { case (?b) { b > 1.2 }; case (null) { false } }) {
              "Research shows high beta assets outperform in bull markets";
            } else { "Neutral" };
          };
          case ("aggressive", "bear") {
            if (assetType == "crypto") {
              "Reduced crypto allocation due to risk";
            } else if (switch (asset.beta) { case (?b) { b > 1.2 }; case (null) { false } }) {
              "Research shows high beta assets underperform in bear markets";
            } else { "Neutral" };
          };
          case ("balanced", "bull") {
            if (assetType == "crypto") {
              "Moderate tilt towards risk assets in bull market";
            } else if (switch (asset.beta) { case (?b) { b > 1.2 }; case (null) { false } }) {
              "Slight tilt towards high beta assets in bull market";
            } else { "Neutral" };
          };
          case ("balanced", "bear") {
            if (assetType == "crypto") {
              "Reduced risk assets in bear market";
            } else if (sector == "technology" or sector == "crypto") {
              "Reduced risk assets in bear market";
            } else { "Neutral" };
          };
          case ("conservative", "bull") {
            if (assetType == "crypto") {
              "Minimal high risk allocation for growth";
            } else if (sector == "technology" or sector == "crypto") {
              "Minimal high risk allocation for growth";
            } else if (
              switch (asset.dividendYield) {
                case (null) { false };
                case (?d) { d > 0.02 };
              }
            ) {
              "Research shows high dividend stocks outperform over time";
            } else { "Neutral" };
          };
          case ("conservative", "bear") {
            if (assetType == "crypto") {
              "Near-zero allocation to defensive assets";
            } else if (sector == "technology" or sector == "crypto") {
              "Near-zero allocation to defensive assets";
            } else if (
              switch (asset.dividendYield) {
                case (null) { false };
                case (?d) { d > 0.02 };
              }
            ) {
              "Research shows high dividend stocks outperform over time";
            } else {
              "Stable original weight";
            };
          };
          case (_) { "Stable original weight" };
        };

        {
          asset;
          suggestedTargetPct;
          rationale;
        };
      }
    );
  };

  func emptyPortfolioSummary() : PortfolioSummary {
    {
      totalMarketValue = 0.0;
      totalCostBasis = 0.0;
      totalGainLoss = 0.0;
      totalGainLossPct = 0.0;
      assets = [];
    };
  };

  // Query functions - ONLY return caller's own data (or requested user's public data)

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Return the requested user's profile (profiles are public, no admin check needed)
    userProfiles.get(user);
  };

  public query ({ caller }) func getPortfolios() : async [Portfolio] {
    switch (userPortfolios.get(caller)) {
      case (null) { [] };
      case (?portfolios) { portfolios.values().toArray().sort() };
    };
  };

  public query ({ caller }) func getAssets(portfolioId : Nat) : async [Asset] {
    // Only return assets for caller's own portfolio
    switch (userAssets.get(caller)) {
      case (null) { [] };
      case (?assets) {
        switch (assets.get(portfolioId)) {
          case (null) { [] };
          case (?assets) {
            assets.values().toArray().sort();
          };
        };
      };
    };
  };

  public query ({ caller }) func getPortfolioSummary(portfolioId : Nat) : async PortfolioSummary {
    switch (userAssets.get(caller)) {
      case (null) { return emptyPortfolioSummary() };
      case (?assets) {
        switch (assets.get(portfolioId)) {
          case (null) { return emptyPortfolioSummary() };
          case (?assets) { calculatePortfolioSummary(assets.values().toArray().sort()) };
        };
      };
    };
  };

  public query ({ caller }) func getRebalanceSuggestions(portfolioId : Nat) : async [RebalanceSuggestion] {
    switch (userAssets.get(caller)) {
      case (null) { [] };
      case (?assets) {
        switch (assets.get(portfolioId)) {
          case (null) { [] };
          case (?assets) {
            rebalanceSuggestions(
              assets.values().toArray().sort(),
              assets.values().toArray().sort().foldLeft(0.0, func(acc, asset) { acc + (asset.quantity * asset.currentPrice) }),
            );
          };
        };
      };
    };
  };

  public query ({ caller }) func getProfileRebalanceSuggestions(
    portfolioId : Nat,
    marketCondition : Text,
    riskProfile : Text,
  ) : async [ProfileRebalanceSuggestion] {
    switch (userAssets.get(caller)) {
      case (null) { [] };
      case (?assets) {
        switch (assets.get(portfolioId)) {
          case (null) { [] };
          case (?assets) {
            calculateProfileRebalanceSuggestions(
              assets.values().toArray().sort(),
              marketCondition,
              riskProfile,
            );
          };
        };
      };
    };
  };

  // Shared functions - can mutate state

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    validateNotAnonymous(caller);
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func initialize() : async () {
    validateNotAnonymous(caller);

    switch (userPortfolios.get(caller)) {
      case (?portfolios) {
        if (not portfolios.isEmpty()) { return };
      };
      case (null) {};
    };

    let portfolioId = 1;
    let portfolio : Portfolio = {
      id = portfolioId;
      name = "My Portfolio";
      createdAt = Time.now();
    };

    let portfolios = Map.singleton<Nat, Portfolio>(portfolioId, portfolio);
    userPortfolios.add(caller, portfolios);
    nextPortfolioId.add(caller, portfolioId + 1);

    let assets = Map.empty<Nat, Asset>();

    let stockAssets : [Asset] = [
      {
        id = 1;
        portfolioId;
        ticker = "AAPL";
        name = "Apple Inc.";
        assetType = "stock";
        quantity = 10.0;
        avgBuyPrice = 120.0;
        currentPrice = 130.0;
        targetAllocationPct = 20.0;
        marketCap = ?2.1e12;
        peRatio = ?28.5;
        sector = ?"technology";
        dividendYield = ?0.006;
        beta = ?1.2;
        notes = ?"Stable growth tech";
      },
      {
        id = 2;
        portfolioId;
        ticker = "MSFT";
        name = "Microsoft Corp.";
        assetType = "stock";
        quantity = 8.0;
        avgBuyPrice = 210.0;
        currentPrice = 215.0;
        targetAllocationPct = 18.0;
        marketCap = ?1.9e12;
        peRatio = ?30.2;
        sector = ?"technology";
        dividendYield = ?0.008;
        beta = ?1.1;
        notes = ?"Established tech";
      },
      {
        id = 3;
        portfolioId;
        ticker = "GOOGL";
        name = "Alphabet Inc.";
        assetType = "stock";
        quantity = 5.0;
        avgBuyPrice = 1800.0;
        currentPrice = 1850.0;
        targetAllocationPct = 15.0;
        marketCap = ?1.5e12;
        peRatio = ?25.1;
        sector = ?"technology";
        dividendYield = null;
        beta = ?1.3;
        notes = ?"Tech giant";
      },
      {
        id = 4;
        portfolioId;
        ticker = "AMZN";
        name = "Amazon";
        assetType = "stock";
        quantity = 2.0;
        avgBuyPrice = 3100.0;
        currentPrice = 3200.0;
        targetAllocationPct = 12.0;
        marketCap = ?1.7e12;
        peRatio = ?58.7;
        sector = ?"consumer discretionary";
        dividendYield = null;
        beta = ?1.5;
        notes = ?"High growth potential";
      },
      {
        id = 5;
        portfolioId;
        ticker = "NVDA";
        name = "NVIDIA Corp.";
        assetType = "stock";
        quantity = 7.0;
        avgBuyPrice = 500.0;
        currentPrice = 510.0;
        targetAllocationPct = 10.0;
        marketCap = ?700000000000;
        peRatio = ?92.4;
        sector = ?"technology";
        dividendYield = ?0.002;
        beta = ?1.7;
        notes = ?"AI & GPU leader";
      },
      {
        id = 6;
        portfolioId;
        ticker = "BTC";
        name = "Bitcoin";
        assetType = "crypto";
        quantity = 0.5;
        avgBuyPrice = 30000.0;
        currentPrice = 35000.0;
        targetAllocationPct = 15.0;
        marketCap = null;
        peRatio = null;
        sector = ?"crypto";
        dividendYield = null;
        beta = ?2.0;
        notes = ?"High risk crypto";
      },
      {
        id = 7;
        portfolioId;
        ticker = "ETH";
        name = "Ethereum";
        assetType = "crypto";
        quantity = 5.0;
        avgBuyPrice = 2000.0;
        currentPrice = 2100.0;
        targetAllocationPct = 7.0;
        marketCap = null;
        peRatio = null;
        sector = ?"crypto";
        dividendYield = null;
        beta = ?2.2;
        notes = ?"Smart contract platform";
      },
      {
        id = 8;
        portfolioId;
        ticker = "SOL";
        name = "Solana";
        assetType = "crypto";
        quantity = 50.0;
        avgBuyPrice = 30.0;
        currentPrice = 32.0;
        targetAllocationPct = 3.0;
        marketCap = null;
        peRatio = null;
        sector = ?"crypto";
        dividendYield = null;
        beta = ?2.5;
        notes = ?"Emerging crypto asset";
      },
    ];

    for (asset in stockAssets.values()) {
      assets.add(asset.id, asset);
    };

    userAssets.add(caller, Map.singleton<Nat, Map.Map<Nat, Asset>>(portfolioId, assets));
    nextAssetId.add(caller, Map.singleton<Nat, Nat>(portfolioId, 9));
  };

  public shared ({ caller }) func createPortfolio(name : Text) : async Nat {
    validateNotAnonymous(caller);

    let portfolioId = switch (nextPortfolioId.get(caller)) {
      case (null) { 1 };
      case (?id) { id };
    };

    let portfolio : Portfolio = {
      id = portfolioId;
      name;
      createdAt = Time.now();
    };

    let portfolios = switch (userPortfolios.get(caller)) {
      case (null) { Map.empty<Nat, Portfolio>() };
      case (?p) { p };
    };
    portfolios.add(portfolioId, portfolio);
    userPortfolios.add(caller, portfolios);
    nextPortfolioId.add(caller, portfolioId + 1);
    portfolioId;
  };

  public shared ({ caller }) func renamePortfolio(id : Nat, newName : Text) : async () {
    validateNotAnonymous(caller);

    if (not verifyPortfolioOwnershipSync(caller, id)) {
      Runtime.trap("Portfolio not found");
    };

    switch (userPortfolios.get(caller)) {
      case (null) { Runtime.trap("No portfolios found for user") };
      case (?portfolios) {
        switch (portfolios.get(id)) {
          case (null) { Runtime.trap("Portfolio not found") };
          case (?portfolio) {
            portfolios.add(id, { id = portfolio.id; name = newName; createdAt = portfolio.createdAt });
          };
        };
      };
    };
  };

  public shared ({ caller }) func deletePortfolio(id : Nat) : async () {
    validateNotAnonymous(caller);

    if (not verifyPortfolioOwnershipSync(caller, id)) {
      Runtime.trap("Portfolio not found");
    };

    switch (userPortfolios.get(caller)) {
      case (null) {
        Runtime.trap("No portfolios found for user");
      };
      case (?portfolios) {
        portfolios.remove(id);
        switch (userAssets.get(caller)) {
          case (null) {};
          case (?assets) { assets.remove(id) };
        };
        switch (nextAssetId.get(caller)) {
          case (null) {};
          case (?ids) { ids.remove(id) };
        };
      };
    };
  };

  public shared ({ caller }) func addAsset(
    portfolioId : Nat,
    ticker : Text,
    name : Text,
    assetType : Text,
    quantity : Float,
    avgBuyPrice : Float,
    currentPrice : Float,
    targetAllocationPct : Float,
    marketCap : ?Float,
    peRatio : ?Float,
    sector : ?Text,
    dividendYield : ?Float,
    beta : ?Float,
    notes : ?Text,
  ) : async Nat {
    validateNotAnonymous(caller);

    if (not verifyPortfolioOwnershipSync(caller, portfolioId)) {
      Runtime.trap("Portfolio not found");
    };

    let assetId = switch (nextAssetId.get(caller)) {
      case (null) {
        nextAssetId.add(caller, Map.singleton<Nat, Nat>(portfolioId, 2));
        1;
      };
      case (?ids) {
        switch (ids.get(portfolioId)) {
          case (null) { ids.add(portfolioId, 2); 1 };
          case (?id) { ids.add(portfolioId, id + 1); id };
        };
      };
    };

    let asset : Asset = {
      id = assetId;
      portfolioId;
      ticker;
      name;
      assetType;
      quantity;
      avgBuyPrice;
      currentPrice;
      targetAllocationPct;
      marketCap;
      peRatio;
      sector;
      dividendYield;
      beta;
      notes;
    };

    let portfoliosAssets = switch (userAssets.get(caller)) {
      case (null) { Map.empty<Nat, Map.Map<Nat, Asset>>() };
      case (?p) { p };
    };
    let assets = switch (portfoliosAssets.get(portfolioId)) {
      case (null) { Map.empty<Nat, Asset>() };
      case (?a) { a };
    };

    assets.add(assetId, asset);
    portfoliosAssets.add(portfolioId, assets);
    userAssets.add(caller, portfoliosAssets);
    assetId;
  };

  public shared ({ caller }) func updateAsset(asset : Asset) : async () {
    validateNotAnonymous(caller);

    if (not verifyPortfolioOwnershipSync(caller, asset.portfolioId)) {
      Runtime.trap("Portfolio not found");
    };

    let portfoliosAssets = switch (userAssets.get(caller)) {
      case (null) { Runtime.trap("No assets found for user") };
      case (?p) { p };
    };
    let assets = switch (portfoliosAssets.get(asset.portfolioId)) {
      case (null) { Runtime.trap("Portfolio not found") };
      case (?a) { a };
    };
    if (not assets.containsKey(asset.id)) { Runtime.trap("Asset not found") };
    assets.add(asset.id, asset);
  };

  public shared ({ caller }) func removeAsset(portfolioId : Nat, assetId : Nat) : async () {
    validateNotAnonymous(caller);

    if (not verifyPortfolioOwnershipSync(caller, portfolioId)) {
      Runtime.trap("Portfolio not found");
    };

    let portfoliosAssets = switch (userAssets.get(caller)) {
      case (null) { Runtime.trap("No assets found for user") };
      case (?p) { p };
    };
    let assets = switch (portfoliosAssets.get(portfolioId)) {
      case (null) { Runtime.trap("Portfolio not found") };
      case (?a) { a };
    };
    if (not assets.containsKey(assetId)) { Runtime.trap("Asset not found") };
    assets.remove(assetId);
  };
};
