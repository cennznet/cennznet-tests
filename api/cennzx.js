"use strict";

const { sleep } = require('./util')
const { SpotX } = require('@cennznet/spotx')
const node = require('./node')
const { bootNodeApi } = require('./websocket');
const fee = require('./fee');


 async function initSpotX(traderSeed, nodeApi = bootNodeApi){
    const api = await nodeApi.getApi()
    await node.setApiSigner(api, traderSeed)
    return new SpotX(api);
}

// check if the eventMethod is in the tx events
async function checkTxEvent(txResult, eventMethod){
    let bGet = false
    for(let i = 0; i < txResult.events.length; i += 1) {
        const event = txResult.events[i];
        if (event.event.method === eventMethod) {
            bGet = true;
            break;
        }
    }
    return bGet
}

/**
 * Deposit core asset and trade asset at current ratio to mint exchange tokens (returns amount of exchange tokens minted)
 * @ minLiquidity: the minimum liquidity value wanted
 * @ maxAssetAmount: the max amount to add in pool. If the calulated amount is greater then it, tx will get failure.
 *                  Note:
 *                      - In terms of the caculation and digital round fact, maxAssetAmount must be 1 larger than theoretical max value.
 *                        e.g. If 5000 is the max value, the maxAssetAmount should be at least 5001.
 *                      - For the first call, maxAssetAmount will be the initial liquidity.
 *                      - For later calls, asset amount should meet the formula: new_token_amt / token_pool_amt = new_core_amt / core_pool_amt.
 *                              This is for keep the proportion of the token and core.
 * @ coreAmount: the exact core asset amount to add into pool. This value is the initial liquidity.
 */
module.exports.addLiquidity = async function (traderSeed, assetId, minLiquidity, maxAssetAmount, coreAmount, nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)

    const trans = spotX.addLiquidity(assetId, minLiquidity, maxAssetAmount, coreAmount, 10)

    const txResult = await node.signAndSendTx(trans, traderSeed)

    let isCreated = false

    // check if the expected event appeared
    isCreated = checkTxEvent(txResult, 'AddLiquidity')

    if (isCreated){
        txResult.bSucc = true
        txResult.txFee = await fee.queryTxFee(txResult.blockHash, txResult.extrinsicIndex, nodeApi)
    }
    else{
        txResult.bSucc = false
    }

    return txResult
}

/**
 * Burn exchange tokens to withdraw core asset and trade asset at current ratio
 * @ assetAmount: amount of exchange token to be burned. This is the value that will be definitely deducted.
 * @ minAssetWithdraw: minimum core asset withdrawn. If actual asset amount withdrawed is lower than this value, tx will get failure.
 * @ minCoreWithdraw: minimum trade asset withdrawn. If actual core amount withdrawded is lower than this value, tx will get failure.
 */
module.exports.removeLiquidity = async function (traderSeed, assetId, assetAmount, minAssetWithdraw, minCoreWithdraw, nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)

    const trans = spotX.removeLiquidity(assetId, assetAmount, minAssetWithdraw, minCoreWithdraw)

    const txResult = await node.signAndSendTx(trans, traderSeed)

    let bSucc = false

    // check if the expected event appeared
    bSucc = checkTxEvent(txResult, 'RemoveLiquidity')

    if (bSucc){
        txResult.bSucc = true
        txResult.txFee = await fee.queryTxFee(txResult.blockHash, txResult.extrinsicIndex, nodeApi)
    }
    else{
        txResult.bSucc = false
    }

    return txResult
}

// Note: There will be an exchange fee rate in the calculation processs
module.exports.coreToAssetSwapOutput = async function (traderSeed, assetId, assetAmountBought, maxCoreAssetSold, nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)

    const trans = spotX.coreToAssetSwapOutput(assetId, assetAmountBought, maxCoreAssetSold)

    const txResult = await node.signAndSendTx(trans, traderSeed)

    return txResult
}


module.exports.getLiquidityBalance = async function (assetId, traderSeed, nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)
    return await spotX.getLiquidityBalance(assetId, node.getAddressFromSeed(traderSeed));
}

module.exports.getExchangeAddress = async function ( assetId, traderSeed, nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)
    return await spotX.getExchangeAddress(assetId);
}

module.exports.getCoreAssetId = async function ( traderSeed = 'Alice', nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)
    return await spotX.getCoreAssetId();
}

module.exports.getFeeRate = async function ( traderSeed = 'Alice', nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)
    return await spotX.getFeeRate();
}

module.exports.getTotalLiquidity = async function (assetId, traderSeed, nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)
    return await spotX.getTotalLiquidity(assetId);
}