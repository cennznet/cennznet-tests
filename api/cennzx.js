"use strict";

const { sleep } = require('./util')
const { SpotX } = require('@cennznet/spotx')
const node = require('./node')
const { bootNodeApi } = require('./websocket');


 async function initSpotX(ownerSeed, nodeApi = bootNodeApi){
    const api = await nodeApi.getApi()
    await node.setApiSigner(api, ownerSeed)
    return new SpotX(api);
}

/**
 * Deposit core asset and trade asset at current ratio to mint exchange tokens (returns amount of exchange tokens minted)
 * @ minLiquidity: the minimum liquidity value wanted
 * @ maxAssetAmount: the max amount to add in pool. If the calulated amount is greater then it, tx will get failure.
 *                   For the first call, maxAssetAmount will be the initial liquidity
 * @ coreAmount: the exact core asset amount to add into pool
 */
module.exports.addLiquidity = async function (ownerSeed, assetId, minLiquidity, maxAssetAmount, coreAmount, nodeApi = bootNodeApi){
    const spotX = await initSpotX(ownerSeed, nodeApi)

    const trans = spotX.addLiquidity(assetId, minLiquidity, maxAssetAmount, coreAmount, 10)

    const txResult = await node.signAndSendTx(trans, ownerSeed)

    let isCreated = false

    // check if the expected event appeared
    for(let i = 0; i < txResult.events.length; i += 1) {
        const event = txResult.events[i];
        if (event.event.method === 'AddLiquidity') {
            isCreated = true;
            break;
        }
    }

    if (isCreated){
        txResult.bSucc = true
    }

    return txResult
}

/**
 * Burn exchange tokens to withdraw core asset and trade asset at current ratio
 * @ assetAmount: amount of exchange token to be burned. This is the value that will be definitely deducted.
 * @ minAssetWithdraw: minimum core asset withdrawn. If actual asset amount withdrawed is lower than this value, tx will get failure.
 * @ minCoreWithdraw: minimum trade asset withdrawn. If actual core amount withdrawded is lower than this value, tx will get failure.
 */
module.exports.removeLiquidity = async function (ownerSeed, assetId, assetAmount, minAssetWithdraw, minCoreWithdraw, nodeApi = bootNodeApi){
    const spotX = await initSpotX(ownerSeed, nodeApi)

    const trans = spotX.removeLiquidity(assetId, assetAmount, minAssetWithdraw, minCoreWithdraw)

    const txResult = await node.signAndSendTx(trans, ownerSeed)

    let isCreated = false

    // check if the expected event appeared
    for(let i = 0; i < txResult.events.length; i += 1) {
        const event = txResult.events[i];
        if (event.event.method === 'RemoveLiquidity') {
            isCreated = true;
            break;
        }
    }

    if (isCreated){
        txResult.bSucc = true
    }

    return txResult
}

module.exports.getLiquidityBalance = async function (assetId, ownerSeed, nodeApi = bootNodeApi){
    const spotX = await initSpotX(ownerSeed, nodeApi)
    return await spotX.getLiquidityBalance(assetId, node.getAddressFromSeed(ownerSeed));
}

module.exports.getExchangeAddress = async function ( assetId, ownerSeed, nodeApi = bootNodeApi){
    const spotX = await initSpotX(ownerSeed, nodeApi)
    return await spotX.getExchangeAddress(assetId);
}

module.exports.getCoreAssetId = async function ( ownerSeed = 'Alice', nodeApi = bootNodeApi){
    const spotX = await initSpotX(ownerSeed, nodeApi)
    return await spotX.getCoreAssetId();
}

module.exports.getTotalLiquidity = async function (assetId, ownerSeed, nodeApi = bootNodeApi){
    const spotX = await initSpotX(ownerSeed, nodeApi)
    return await spotX.getTotalLiquidity(assetId);
}