import { idl, utils } from "@zetamarkets/sdk";
import * as anchor from "@project-serum/anchor";
import {
  PartiallyDecodedInstruction,
  ParsedConfirmedTransaction,
} from "@solana/web3.js";
import { IZetaTransaction } from "./types";
import * as zetaTypes from "./instruction-types";

let coder = new anchor.Coder(idl as anchor.Idl);
const idlMap = new Map(idl.instructions.map((x) => [x.name, x.args]));

function parseZetaInstruction(
  ix: PartiallyDecodedInstruction
): anchor.Instruction {
  let decodedIx = coder.instruction.decode(ix.data, "base58");
  // Add any custom parsing logic for individual ixs
  switch (decodedIx.name) {
    case "initializeZetaGroup":
      // args: InitializeZetaGroupArgs
      break;
    case "overrideExpiry":
      // args: overrideExpiryArgs
      break;

    case "overrideExpiry":
      // args: OverrideExpiryArgs;
      break;
    case "initializeMarginAccount":
      // nonce: number;
      break;

    case "initializeMarketIndexes":
      // nonce: number;
      break;

    case "initializeMarketNode":
      // args: InitializeMarketNodeArgs;
      break;

    case "haltZetaGroup":
      break;

    case "unhaltZetaGroup":
      break;

    case "updateHaltState":
      // args: HaltZetaGroupArgs;
      break;

    case "updateVolatility":
      // args: UpdateVolatilityArgs;
      break;

    case "updateInterestRate":
      // args: UpdateInterestRateArgs;
      break;

    case "addMarketIndexes":

    case "initializeZetaState":
      // args: InitializeStateArgs;
      break;

    case "updateAdmin":
      break;

    case "updateZetaState":
      // args: UpdateStateArgs;
      break;

    case "updatePricingParameters":
      // args: UpdatePricingParametersArgs;
      break;

    case "updateMarginParameters":
      // args: UpdateMarginParametersArgs;
      break;

    case "cleanZetaMarkets":
      break;

    case "cleanZetaMarketsHalted":
      break;

    case "settlePositions":
      // expiryTs: number;
      // settlementNonce: number;
      break;

    case "settlePositionsHalted":
      break;

    case "initializeMarketStrikes":
      break;

    case "expireSeriesOverride":
      // args: ExpireSeriesOverrideArgs;
      break;

    case "expireSeries":
      // settlementNonce: number;
      break;

    case "initializeZetaMarket":
      // args: InitializeMarketArgs;
      break;

    case "retreatMarketNodes":
      // expiryIndex: number;
      break;

    case "cleanMarketNodes":
      // expiryIndex: number;
      break;

    case "updateVolatilityNodes":
      // nodes: number[];
      break;

    case "updatePricing":
      // expiryIndex: number;
      break;

    case "updatePricingHalted":
      // expiryIndex: number;
      break;

    case "deposit":
      // amount: number;
      let depositData = decodedIx.data as zetaTypes.deposit;
      decodedIx.data = {
        amount: utils.convertNativeBNToDecimal(depositData.amount),
      };
      break;

    case "depositInsuranceVault":
      // amount: number;
      break;

    case "withdraw":
      // amount: number;
      let withdrawData = decodedIx.data as zetaTypes.withdraw;
      decodedIx.data = {
        amount: utils.convertNativeBNToDecimal(withdrawData.amount),
      };
      break;

    case "withdrawInsuranceVault":
      // percentageAmount: number;
      break;

    case "initializeOpenOrders":
      // nonce: number;
      // mapNonce: number;
      break;

    case "initializeWhitelistDepositAccount":
      // nonce: number;
      break;

    case "initializeWhitelistInsuranceAccount":
      // nonce: number;
      break;

    case "initializeWhitelistTradingFeesAccount":
      // nonce: number;
      break;

    case "initializeInsuranceDepositAccount":
      // nonce: number;
      break;

    case "placeOrder":
      // price: number;
      // size: number;
      // side: Side;
      // clientOrderId: number | undefined;
      let placeOrderData = decodedIx.data as zetaTypes.placeOrder;
      decodedIx.data = {
        price: utils.convertNativeBNToDecimal(placeOrderData.price),
        size: utils.convertNativeLotSizeToDecimal(
          placeOrderData.size.toNumber()
        ),
        side: Object.keys(placeOrderData.side)[0],
        clientOrderId: placeOrderData.clientOrderId
          ? placeOrderData.clientOrderId.toString()
          : placeOrderData.clientOrderId,
      };
      break;

    case "cancelOrder":
      // side: Side;
      // orderId: number;
      let cancelOrderData = decodedIx.data as zetaTypes.cancelOrder;
      decodedIx.data = {
        side: Object.keys(cancelOrderData.side)[0],
        orderId: cancelOrderData.orderId.toString(),
      };
      break;

    case "cancelOrderHalted":
      // side: Side;
      // orderId: number;
      break;

    case "cancelOrderByClientOrderId":
      // clientOrderId: number;
      break;

    case "cancelExpiredOrder":
      // side: Side;
      // orderId: number;
      break;

    case "forceCancelOrders":
      break;

    case "crankEventQueue":
      break;

    case "rebalanceInsuranceVault":
      break;

    case "liquidate":
      // size: number;
      let liquidateData = decodedIx.data as zetaTypes.liquidate;
      decodedIx.data = {
        size: liquidateData.size,
      };
      break;
  }
  // console.log(decodedIx);
  return decodedIx;
}

export function parseZetaTransaction(
  tx: ParsedConfirmedTransaction
): IZetaTransaction {
  return {
    transaction_id: tx.transaction.signatures[0],
    block_timestamp: tx.blockTime,
    slot: tx.slot,
    is_successful: tx.meta.err ? false : true,
    fee: tx.meta.fee,
    accounts: tx.transaction.message.accountKeys.map((account) =>
      account.pubkey.toString()
    ),
    instructions: tx.transaction.message.instructions.map((ix) =>
      parseZetaInstruction(ix as PartiallyDecodedInstruction)
    ),
    log_messages: tx.meta.logMessages,
  };
}
