"use strict";

const { sleep } = require('./util')
const { SpotX } = require('@cennznet/crml-cennzx-spot')
const node = require('./node')
const { bootNodeApi } = require('./websocket');
const fee = require('./fee');


module.exports.CennzXBalance = class{

    constructor(traderSeed = null, tokenId = -1, coreId = -1){
        this.traderSeed             = traderSeed
        this.tokenId                = tokenId
        this.coreId                 = coreId
        this.totalLiquidity         = 0
        this.traderLiquidity        = 0
        this.poolCoreAsssetBal      = 0
        this.poolTokenAsssetBal     = 0
        this.traderTokenAssetBal    = 0
        this.traderCoreAssetBal     = 0
        this.poolAddress            = null
    }

    async getAll(){
        
        if (this.traderSeed.length <= 0){
            throw new Error(`Trader seed is empty.`)
        }

        // get core asset id
        if (this.coreId < 0 ){
            this.coreId = await cennzx.getCoreAssetId()
        }
        
        // get 
        if (this.tokenId >= 0){
            if ( this.poolAddress == null || this.poolAddress.length != 48 ){    // 48 is the address length
                this.poolAddress = await cennzx.getExchangeAddress(this.tokenId, this.traderSeed)
            }
                
            if ( this.poolAddress.length == 48 ){
                this.poolCoreAsssetBal      = await node.queryFreeBalance(this.poolAddress, this.coreId)
                this.poolTokenAsssetBal     = await node.queryFreeBalance(this.poolAddress, this.tokenId)
                this.traderTokenAssetBal    = await node.queryFreeBalance(this.traderSeed, this.tokenId)
            }
        }

        // get core balance
        this.traderCoreAssetBal = await node.queryFreeBalance(this.traderSeed, this.coreId)
        // get trader's liquidity share
        this.traderLiquidity    = await cennzx.getLiquidityBalance(this.tokenId, this.traderSeed)
        // get total liquidity
        this.totalLiquidity     = await cennzx.getTotalLiquidity(this.tokenId, this.traderSeed)
    }
}


 async function initSpotX(traderSeed, nodeApi = bootNodeApi){
    let api = await nodeApi.getApi()
    await node.setApiSigner(api, traderSeed)
    const spotX = await SpotX.create(api)
    return spotX;
}

// check if the eventMethod is in the tx events
async function checkTxEvent(txResult, eventMethod){
    let bGet = false
    for(let i = 0; i < txResult.events.length; i ++) {
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
 * @ maxAssetAmount: the max amount to add in pool, should be smaller than trader's asset balance. 
 *                   If the calulated amount is greater then it, tx will get failure.
 *                  Note:
 *                      - In terms of the caculation and digital round fact, maxAssetAmount must be 1 larger than theoretical max value.
 *                        e.g. If 5000 is the max value, the maxAssetAmount should be at least 5001.
 *                      - For the first call, maxAssetAmount will be the initial liquidity.
 *                      - For later calls, actual asset amount input should meet the formula: new_token_amt / token_pool_amt = new_core_amt / core_pool_amt.
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

// Note: There will be an exchange fee rate (not the tx fee) in the calculation processs
module.exports.coreToAssetSwapOutput = async function (traderSeed, assetId, assetAmountBought, maxCoreAssetSold, nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)

    const trans = spotX.coreToAssetSwapOutput(assetId, assetAmountBought, maxCoreAssetSold)

    const txResult = await node.signAndSendTx(trans, traderSeed)

    return txResult
}

// swap token to core and transfer out. Then token bought is a fixed value, should 1st get the needed core asset and then calculate its exchange fee.
module.exports.coreToAssetTransferOutput = async function (traderSeed, recipient, assetId, tokenAmountBought, maxCoreSold, nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)

    const trans = spotX.coreToAssetTransferOutput( node.getAddressFromSeed(recipient) , assetId, tokenAmountBought, maxCoreSold)

    const txResult = await node.signAndSendTx(trans, traderSeed)

    return txResult
}

module.exports.getCoreToAssetOutputPrice = async function (assetId, assetAmountInput, traderSeed = 'Alice', nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)
    const coreSold = await spotX.getCoreToAssetOutputPrice(assetId, assetAmountInput)
    return coreSold.toString()
}

module.exports.getLiquidityBalance = async function (assetId, traderSeed, nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)
    const val = await spotX.getLiquidityBalance(assetId, node.getAddressFromSeed(traderSeed))
    return val.toString()
}

module.exports.getExchangeAddress = async function ( assetId, traderSeed, nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)
    const address = await spotX.getExchangeAddress(assetId)
    return address.toString()
}

module.exports.getCoreAssetId = async function ( traderSeed = 'Alice', nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)
    return await spotX.getCoreAssetId();
}

module.exports.getFeeRate = async function ( traderSeed = 'Alice', nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)
    return spotX.getFeeRate()
    // const x = spotX.getCoreAssetId()
    // console.log('x =', x.toString())
    // return 3000
}

module.exports.getTotalLiquidity = async function (assetId, traderSeed, nodeApi = bootNodeApi){
    const spotX = await initSpotX(traderSeed, nodeApi)
    const val = await spotX.getTotalLiquidity(assetId)
    return val.toString();
}