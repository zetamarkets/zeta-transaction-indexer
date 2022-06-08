import { idl, utils } from "@zetamarkets/sdk";
import * as anchor from "@project-serum/anchor";
import {
  PartiallyDecodedInstruction,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { ZetaTransaction, Instruction } from "./types";
import * as zetaTypes from "./instruction-types";
import { PROGRAM_ID } from "./constants";

function flattenNestedAccounts(x: any) {
  if (x.accounts) {
    return x.accounts.flatMap(flattenNestedAccounts);
  } else {
    return x;
  }
}

let coder = new anchor.BorshCoder(idl as anchor.Idl);
const idlAccountMap = new Map(
  idl.instructions.map((x) => [x.name, flattenNestedAccounts(x)])
);

let eventParser = new anchor.EventParser(PROGRAM_ID, coder);

// TODO: get authority account
function parseZetaInstructionAccounts(
  ix_name: string,
  ix: PartiallyDecodedInstruction
) {
  let accountNames = idlAccountMap.get(ix_name).map((account) => account.name);
  let namedAccounts = {};
  // Using the foreach method
  accountNames.forEach((k, i) => {
    namedAccounts[k] = ix.accounts[i].toString();
  });
  return namedAccounts;
}

function enrichInstructions(
  instructions: Instruction[],
  events: anchor.Event[]
) {
  if (events == undefined || events.length == 0) {
    return;
  }

  // We can have multiple instructions in a single transaction, so keep track of how deep we've searched
  let currentPlaceOrderInstruction = 0;
  let currentLiquidateInstruction = 0;

  for (var event = 0; event < events.length; event++) {
    // Guaranteed to have 1 PlaceOrderEvent for each placeOrder instruction
    if (events[event].name === "PlaceOrderEvent") {
      // Find the corresponding placeOrder for a given PlaceOrderEvent
      for (var i = currentPlaceOrderInstruction; i < instructions.length; i++) {
        if (instructions[i].name.startsWith("placeOrder")) {
          let fee = events[event].data.fee as anchor.BN;
          let oraclePrice = events[event].data.oraclePrice as anchor.BN;

          // Enrich the placeOrder Ix using data from the corresponding PlaceOrderEvent
          instructions[i].instruction["tradingFee"] =
            utils.convertNativeBNToDecimal(fee);
          instructions[i].instruction["oraclePrice"] =
            utils.convertNativeBNToDecimal(oraclePrice);
          instructions[i].instruction["orderId"] =
            events[event].data.orderId.toString();
          // TODO change to use events[event].data.isTaker once the program is in mainnet
          instructions[i].instruction["isTaker"] = events[event].data.fee != 0;
          currentPlaceOrderInstruction = i + 1;
          break;
        }
      }
      // Guaranteed to have 1 LiquidationEvent for each liquidate instruction
    } else if (events[event].name == "LiquidationEvent") {
      // Find the corresponding liquidate for a given LiquidationEvent
      for (var i = currentLiquidateInstruction; i < instructions.length; i++) {
        if (instructions[i].name.startsWith("liquidate")) {
          // Enrich the liquidate Ix using data from the corresponding LiquidationEvent
          instructions[i].instruction["liquidator_reward"] =
            utils.convertNativeBNToDecimal(
              events[event].data.liquidatorReward as anchor.BN
            );
          instructions[i].instruction["insurance_reward"] =
            utils.convertNativeBNToDecimal(
              events[event].data.insuranceReward as anchor.BN
            );
          instructions[i].instruction["cost_of_trades"] =
            utils.convertNativeBNToDecimal(
              events[event].data.costOfTrades as anchor.BN
            );
          instructions[i].instruction["size"] =
            utils.convertNativeLotSizeToDecimal(
              events[event].data.size as number
            );
          instructions[i].instruction["remaining_liquidatee_balance"] =
            utils.convertNativeLotSizeToDecimal(
              events[event].data.remainingLiquidateeBalance as number
            );
          instructions[i].instruction["remaining_liquidator_balance"] =
            utils.convertNativeLotSizeToDecimal(
              events[event].data.remainingLiquidatorBalance as number
            );
          instructions[i].instruction["mark_price"] =
            utils.convertNativeBNToDecimal(
              events[event].data.markPrice as anchor.BN
            );
          instructions[i].instruction["underlying_price"] =
            utils.convertNativeBNToDecimal(
              events[event].data.underlyingPrice as anchor.BN
            );
          currentLiquidateInstruction = i + 1;
        }
      }
    }
  }
}

function parseZetaInstruction(ix: PartiallyDecodedInstruction): Instruction {
  let decodedIx = coder.instruction.decode(ix.data, "base58");
  if (decodedIx == null) {
    throw new Error(`Instruction data ${ix.data} failed to decode`);
  }
  let namedAccounts = parseZetaInstructionAccounts(decodedIx.name, ix);

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

    case "placeOrderV2":
      // price: number;
      // size: number;
      // side: Side;
      // orderType: orderType
      // clientOrderId: number | undefined;
      let placeOrderV2Data = decodedIx.data as zetaTypes.placeOrderV2;
      decodedIx.data = {
        price: utils.convertNativeBNToDecimal(placeOrderV2Data.price),
        size: utils.convertNativeLotSizeToDecimal(
          placeOrderV2Data.size.toNumber()
        ),
        side: Object.keys(placeOrderV2Data.side)[0],
        orderType: Object.keys(placeOrderV2Data.orderType)[0],
        clientOrderId: placeOrderV2Data.clientOrderId?.toString(),
      };
      break;

    case "placeOrderV3":
      // price: number;
      // size: number;
      // side: Side;
      // orderType: orderType
      // clientOrderId: number | undefined;
      // tag: String | undefined;
      let placeOrderV3Data = decodedIx.data as zetaTypes.placeOrderV3;
      decodedIx.data = {
        price: utils.convertNativeBNToDecimal(placeOrderV3Data.price),
        size: utils.convertNativeLotSizeToDecimal(
          placeOrderV3Data.size.toNumber()
        ),
        side: Object.keys(placeOrderV3Data.side)[0],
        orderType: Object.keys(placeOrderV3Data.orderType)[0],
        clientOrderId: placeOrderV3Data.clientOrderId?.toString(),
        tag: placeOrderV3Data?.tag,
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

    case "cancelOrderNoError":
      // side: Side;
      // orderId: number;
      let cancelOrderNoErrorData =
        decodedIx.data as zetaTypes.cancelOrderNoError;
      decodedIx.data = {
        side: Object.keys(cancelOrderNoErrorData.side)[0],
        orderId: cancelOrderNoErrorData.orderId.toString(),
      };
      break;

    case "cancelOrderHalted":
      // side: Side;
      // orderId: number;
      let cancelOrderHaltedData = decodedIx.data as zetaTypes.cancelOrderHalted;
      decodedIx.data = {
        side: Object.keys(cancelOrderHaltedData.side)[0],
        orderId: cancelOrderHaltedData.orderId.toString(),
      };
      break;

    case "cancelOrderByClientOrderId":
      // clientOrderId: number;
      let cancelOrderByClientOrderIdData =
        decodedIx.data as zetaTypes.cancelOrderByClientOrderId;
      decodedIx.data = {
        clientOrderId: cancelOrderByClientOrderIdData.clientOrderId.toString(),
      };
      break;

    case "cancelOrderByClientOrderIdNoError":
      // clientOrderId: number;
      let cancelOrderByClientOrderIdNoErrorData =
        decodedIx.data as zetaTypes.cancelOrderByClientOrderIdNoError;
      decodedIx.data = {
        clientOrderId:
          cancelOrderByClientOrderIdNoErrorData.clientOrderId.toString(),
      };
      break;

    case "cancelExpiredOrder":
      // side: Side;
      // orderId: number;
      let cancelExpiredOrderData =
        decodedIx.data as zetaTypes.cancelExpiredOrder;
      decodedIx.data = {
        side: Object.keys(cancelExpiredOrderData.side)[0],
        orderId: cancelExpiredOrderData.orderId.toString(),
      };
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
        size: utils.convertNativeLotSizeToDecimal(
          liquidateData.size.toNumber()
        ),
      };
      break;
  }
  return {
    name: decodedIx.name,
    instruction: decodedIx.data,
    named_accounts: namedAccounts,
    program_id: ix.programId.toString(),
  };
}

export function parseZetaTransaction(
  tx: ParsedTransactionWithMeta
): ZetaTransaction {
  let parsedInstructions: Instruction[];
  let instructions = tx.transaction.message.instructions.flatMap(
    (ix, index) => {
      // Handle CPI instructions, replace them with inner Zeta ixs
      if (!ix.programId.equals(PROGRAM_ID)) {
        let innerIxsforOuterIx = tx.meta.innerInstructions.filter(
          (innerIxs) => innerIxs.index == index
        )[0];
        let innerIxs = innerIxsforOuterIx.instructions.filter((innerIx) =>
          innerIx.programId.equals(PROGRAM_ID)
        );
        return innerIxs;
      } else {
        return ix;
      }
    }
  );

  let parsedEvents = [];
  eventParser.parseLogs(tx.meta.logMessages, (event) => {
    parsedEvents.push(event);
  });

  parsedInstructions = instructions.map((ix) =>
    parseZetaInstruction(ix as PartiallyDecodedInstruction)
  );

  enrichInstructions(parsedInstructions, parsedEvents);

  return {
    transaction_id: tx.transaction.signatures[0],
    block_timestamp: tx.blockTime,
    slot: tx.slot,
    is_successful: tx.meta.err ? false : true,
    fee: tx.meta.fee,
    accounts: tx.transaction.message.accountKeys.map((account) =>
      account.pubkey.toString()
    ),
    instructions: parsedInstructions,
    log_messages: tx.meta.logMessages,
    fetch_timestamp: Math.floor(Date.now() / 1000),
  };
}
