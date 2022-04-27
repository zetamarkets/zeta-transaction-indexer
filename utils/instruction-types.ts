import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

export interface ProductGreeks {
  delta: anchor.BN;
  vega: AnchorDecimal;
  volatility: AnchorDecimal;
}

export interface AnchorDecimal {
  flags: number;
  hi: number;
  lo: number;
  mid: number;
}

export interface HaltState {
  halted: boolean;
  spotPrice: anchor.BN;
  timestamp: anchor.BN;
  markPricesSet: boolean[];
  markPricesSetPadding: boolean[];
  marketNodesCleaned: boolean[];
  marketNodesCleanedPadding: boolean[];
  marketCleaned: boolean[];
  marketCleanedPadding: boolean[];
}

export interface PricingParameters {
  optionTradeNormalizer: AnchorDecimal;
  futureTradeNormalizer: AnchorDecimal;
  maxVolatilityRetreat: AnchorDecimal;
  maxInterestRetreat: AnchorDecimal;
  maxDelta: anchor.BN;
  minDelta: anchor.BN;
  minVolatility: anchor.BN;
  maxVolatility: anchor.BN;
  minInterestRate: anchor.BN;
  maxInterestRate: anchor.BN;
}

export interface MarginParameters {
  futureMarginInitial: anchor.BN;
  futureMarginMaintenance: anchor.BN;
  optionMarkPercentageLongInitial: anchor.BN;
  optionSpotPercentageLongInitial: anchor.BN;
  optionSpotPercentageShortInitial: anchor.BN;
  optionDynamicPercentageShortInitial: anchor.BN;
  optionMarkPercentageLongMaintenance: anchor.BN;
  optionSpotPercentageLongMaintenance: anchor.BN;
  optionSpotPercentageShortMaintenance: anchor.BN;
  optionDynamicPercentageShortMaintenance: anchor.BN;
  optionShortPutCapPercentage: anchor.BN;
  padding: number[];
}

export interface ExpirySeries {
  activeTs: anchor.BN;
  expiryTs: anchor.BN;
  dirty: boolean;
  padding: number[];
}

export interface Strike {
  isSet: boolean;
  value: anchor.BN;
}

export interface Product {
  market: PublicKey;
  strike: Strike;
  dirty: boolean;
  kind: Kind;
}

export interface Position {
  position: anchor.BN;
  costOfTrades: anchor.BN;
  closingOrders: anchor.BN;
  openingOrders: anchor.BN[];
}

export interface HaltZetaGroupArgs {
  spotPrice: anchor.BN;
  timestamp: anchor.BN;
}

export interface UpdateVolatilityArgs {
  expiryIndex: number;
  volatility: anchor.BN[];
}

export interface UpdateInterestRateArgs {
  expiryIndex: number;
  interestRate: anchor.BN;
}

export interface ExpireSeriesOverrideArgs {
  settlementNonce: number;
  settlementPrice: anchor.BN;
}

export interface InitializeMarketArgs {
  index: number;
  marketNonce: number;
  baseMintNonce: number;
  quoteMintNonce: number;
  zetaBaseVaultNonce: number;
  zetaQuoteVaultNonce: number;
  dexBaseVaultNonce: number;
  dexQuoteVaultNonce: number;
  vaultSignerNonce: anchor.BN;
}

export interface InitializeStateArgs {
  stateNonce: number;
  serumNonce: number;
  mintAuthNonce: number;
  expiryIntervalSeconds: number;
  newExpiryThresholdSeconds: number;
  strikeInitializationThresholdSeconds: number;
  pricingFrequencySeconds: number;
  liquidatorLiquidationPercentage: number;
  insuranceVaultLiquidationPercentage: number;
  nativeTradeFeePercentage: anchor.BN;
  nativeUnderlyingFeePercentage: anchor.BN;
  nativeWhitelistUnderlyingFeePercentage: anchor.BN;
  nativeDepositLimit: anchor.BN;
  expirationThresholdSeconds: number;
}

export interface InitializeMarketNodeArgs {
  nonce: number;
  index: number;
}

export interface OverrideExpiryArgs {
  expiryIndex: number;
  activeTs: anchor.BN;
  expiryTs: anchor.BN;
}

export interface UpdateStateArgs {
  expiryIntervalSeconds: number;
  newExpiryThresholdSeconds: number;
  strikeInitializationThresholdSeconds: number;
  pricingFrequencySeconds: number;
  liquidatorLiquidationPercentage: number;
  insuranceVaultLiquidationPercentage: number;
  nativeTradeFeePercentage: anchor.BN;
  nativeUnderlyingFeePercentage: anchor.BN;
  nativeWhitelistUnderlyingFeePercentage: anchor.BN;
  nativeDepositLimit: anchor.BN;
  expirationThresholdSeconds: number;
}

export interface UpdatePricingParametersArgs {
  optionTradeNormalizer: anchor.BN;
  futureTradeNormalizer: anchor.BN;
  maxVolatilityRetreat: anchor.BN;
  maxInterestRetreat: anchor.BN;
  minDelta: anchor.BN;
  maxDelta: anchor.BN;
  minInterestRate: anchor.BN;
  maxInterestRate: anchor.BN;
  minVolatility: anchor.BN;
  maxVolatility: anchor.BN;
}

export interface UpdateMarginParametersArgs {
  futureMarginInitial: anchor.BN;
  futureMarginMaintenance: anchor.BN;
  optionMarkPercentageLongInitial: anchor.BN;
  optionSpotPercentageLongInitial: anchor.BN;
  optionSpotPercentageShortInitial: anchor.BN;
  optionDynamicPercentageShortInitial: anchor.BN;
  optionMarkPercentageLongMaintenance: anchor.BN;
  optionSpotPercentageLongMaintenance: anchor.BN;
  optionSpotPercentageShortMaintenance: anchor.BN;
  optionDynamicPercentageShortMaintenance: anchor.BN;
  optionShortPutCapPercentage: anchor.BN;
}

export interface InitializeZetaGroupArgs {
  zetaGroupNonce: number;
  underlyingNonce: number;
  greeksNonce: number;
  vaultNonce: number;
  insuranceVaultNonce: number;
  socializedLossAccountNonce: number;
  interestRate: anchor.BN;
  volatility: anchor.BN[];
  optionTradeNormalizer: anchor.BN;
  futureTradeNormalizer: anchor.BN;
  maxVolatilityRetreat: anchor.BN;
  maxInterestRetreat: anchor.BN;
  maxDelta: anchor.BN;
  minDelta: anchor.BN;
  minInterestRate: anchor.BN;
  maxInterestRate: anchor.BN;
  minVolatility: anchor.BN;
  maxVolatility: anchor.BN;
  futureMarginInitial: anchor.BN;
  futureMarginMaintenance: anchor.BN;
  optionMarkPercentageLongInitial: anchor.BN;
  optionSpotPercentageLongInitial: anchor.BN;
  optionSpotPercentageShortInitial: anchor.BN;
  optionDynamicPercentageShortInitial: anchor.BN;
  optionMarkPercentageLongMaintenance: anchor.BN;
  optionSpotPercentageLongMaintenance: anchor.BN;
  optionSpotPercentageShortMaintenance: anchor.BN;
  optionDynamicPercentageShortMaintenance: anchor.BN;
  optionShortPutCapPercentage: anchor.BN;
}

export interface UpdateGreeksArgs {
  index: number;
  theo: anchor.BN;
  delta: number;
  gamma: number;
  volatility: number;
}

// Does this need updating for enums?
export interface ExpirySeriesStatus {}

export interface Kind {}

export interface OrderType {}

export interface Side {}

export interface initializeZetaGroup {
  args: InitializeZetaGroupArgs;
}

export interface overrideExpiry {
  args: OverrideExpiryArgs;
}

export interface initializeMarginAccount {
  nonce: number;
}

export interface initializeMarketIndexes {
  nonce: number;
}

export interface initializeMarketNode {
  args: InitializeMarketNodeArgs;
}

export interface haltZetaGroup {}

export interface unhaltZetaGroup {}

export interface updateHaltState {
  args: HaltZetaGroupArgs;
}

export interface updateVolatility {
  args: UpdateVolatilityArgs;
}

export interface updateInterestRate {
  args: UpdateInterestRateArgs;
}

export interface addMarketIndexes {}

export interface initializeZetaState {
  args: InitializeStateArgs;
}

export interface updateAdmin {}

export interface updateZetaState {
  args: UpdateStateArgs;
}

export interface updatePricingParameters {
  args: UpdatePricingParametersArgs;
}

export interface updateMarginParameters {
  args: UpdateMarginParametersArgs;
}

export interface cleanZetaMarkets {}

export interface cleanZetaMarketsHalted {}

export interface settlePositions {
  expiryTs: anchor.BN;
  settlementNonce: number;
}

export interface settlePositionsHalted {}

export interface initializeMarketStrikes {}

export interface expireSeriesOverride {
  args: ExpireSeriesOverrideArgs;
}

export interface expireSeries {
  settlementNonce: number;
}

export interface initializeZetaMarket {
  args: InitializeMarketArgs;
}

export interface retreatMarketNodes {
  expiryIndex: number;
}

export interface cleanMarketNodes {
  expiryIndex: number;
}

export interface updateVolatilityNodes {
  nodes: anchor.BN[];
}

export interface updatePricing {
  expiryIndex: number;
}

export interface updatePricingHalted {
  expiryIndex: number;
}

export interface deposit {
  amount: anchor.BN;
}

export interface depositInsuranceVault {
  amount: anchor.BN;
}

export interface withdraw {
  amount: anchor.BN;
}

export interface withdrawInsuranceVault {
  percentageAmount: anchor.BN;
}

export interface initializeOpenOrders {
  nonce: number;
  mapNonce: number;
}

export interface initializeWhitelistDepositAccount {
  nonce: number;
}

export interface initializeWhitelistInsuranceAccount {
  nonce: number;
}

export interface initializeWhitelistTradingFeesAccount {
  nonce: number;
}

export interface initializeInsuranceDepositAccount {
  nonce: number;
}

export interface placeOrder {
  price: anchor.BN;
  size: anchor.BN;
  side: Side;
  clientOrderId: anchor.BN | null;
}

export interface placeOrderV2 {
  price: anchor.BN;
  size: anchor.BN;
  side: Side;
  orderType: OrderType;
  clientOrderId: anchor.BN | null;
}

export interface placeOrderV3 {
  price: anchor.BN;
  size: anchor.BN;
  side: Side;
  orderType: OrderType;
  clientOrderId: anchor.BN | null;
  tag: String | null;
}

export interface cancelOrder {
  side: Side;
  orderId: anchor.BN;
}

export interface cancelOrderHalted {
  side: Side;
  orderId: anchor.BN;
}

export interface cancelOrderByClientOrderId {
  clientOrderId: anchor.BN;
}

export interface cancelExpiredOrder {
  side: Side;
  orderId: anchor.BN;
}

export interface forceCancelOrders {}

export interface crankEventQueue {}

export interface rebalanceInsuranceVault {}

export interface liquidate {
  size: number;
}
