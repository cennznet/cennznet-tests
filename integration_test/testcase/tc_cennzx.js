"use strict";

const assert = require('assert')
const cennzx = require('../../api/cennzx')
const ga = require('../../api/ga')
const node = require('../../api/node')
const BigNumber = require('big-number')


var coreAsssetId = -1
var tokenAsssetId = -1
var tokenIssuerSeed = 'Bob'
const tokenTotalAmount = 1000000
var exchangeFeeRate = 0

describe('CennzX test suite', function () {
    
    before( async function(){
        // get core asset id
        coreAsssetId = (await cennzx.getCoreAssetId()).toString()
        let feeRate = (await cennzx.getFeeRate()).toString()
        exchangeFeeRate = parseInt(feeRate) / 1000000.0     // the feeRate is for per mill
    })

    after(function(){
    })

    it.only('Bob creates pool and liquidity for a new token', async function() {
        
        const minLiquidityWanted    = 2
        const maxAssetAmountInput   = 100000
        const coreAmountInput       = 200000

        // create new token
        tokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenTotalAmount)).assetId.toString()

        const traderTokenAsssetBal_before = await node.queryFreeBalance(tokenIssuerSeed, tokenAsssetId)
        const traderCoreAsssetBal_before = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)

        // first add the liquidity
        const txResult = await cennzx.addLiquidity(tokenIssuerSeed, tokenAsssetId, minLiquidityWanted, maxAssetAmountInput, coreAmountInput)
        assert(txResult.bSucc == true, `Call addLiquidity() failed. [MSG = ${txResult.message}]`)

        const txFee = txResult.txFee

        const traderTokenAsssetBal_after    = await node.queryFreeBalance(tokenIssuerSeed, tokenAsssetId)
        const traderCoreAsssetBal_after     = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
        // const liquidityBalance              = await cennzx.getLiquidityBalance(tokenAsssetId, tokenIssuerSeed)
        // const totalLiquidity                = await cennzx.getTotalLiquidity(tokenAsssetId, tokenIssuerSeed)
        const poolAddress                   = await cennzx.getExchangeAddress(tokenAsssetId, tokenIssuerSeed)
        const exchangeCoreAsssetBal         = await node.queryFreeBalance(poolAddress, coreAsssetId)
        const exchangeTokenAsssetBal        = await node.queryFreeBalance(poolAddress, tokenAsssetId)

        // check issuer's token balance
        assert( traderTokenAsssetBal_before - traderTokenAsssetBal_after == maxAssetAmountInput, 
                `Token asset balance is wrong.(Before tx bal = ${traderTokenAsssetBal_before}, after tx bal = ${traderTokenAsssetBal_after}, the difference should = ${maxAssetAmountInput})` )
        // check issuer's core balance
        assert( BigNumber(traderCoreAsssetBal_before).minus(traderCoreAsssetBal_after) == coreAmountInput + txFee, 
                `Core asset balance is wrong.(Before tx bal = ${traderCoreAsssetBal_before}, after tx bal = ${traderCoreAsssetBal_after}, the difference should = ${coreAmountInput + txFee})` )
        // check liquidity balance
        // assert( liquidityBalance == coreAmountInput, `Liquidity balance is wrong.[Expected = ${maxAssetAmountInput}, Actual = ${liquidityBalance}]` )
        // check total liquidity
        // assert( totalLiquidity == coreAmountInput, `Total liquidity is wrong.[Expected = ${maxAssetAmountInput}, Actual = ${totalLiquidity}]` )
        // check core asset balance in exchange address
        assert( exchangeCoreAsssetBal == coreAmountInput, 
                `Exchange core asset balance is wrong.[Expected = ${coreAmountInput}, Actual = ${exchangeCoreAsssetBal}]` )
        // check token asset balance in exchange address
        assert( exchangeTokenAsssetBal == maxAssetAmountInput, 
            `Exchange core asset balance is wrong.[Expected = ${maxAssetAmountInput}, Actual = ${exchangeTokenAsssetBal}]` )
    });

    it.only('------before test:Query liquidity and balance before test', async function () {

        // tokenIssuerSeed = 'Bob'     // TODO: for test
        // tokenAsssetId = '1000051'   // TODO: for test
        await DiaplayInfo('Alice')
    });

    it.only('Alice swap core asset to token asset', async function() {
        const traderSeed = 'Alice'
        const assetAmountBought = 20000
        const maxCoreAssetSold = 200000
        let   expectedValue = 0
        const poolAddress  = await cennzx.getExchangeAddress(tokenAsssetId, tokenIssuerSeed)

        // get all balance before tx
        const poolCoreBal_before = await node.queryFreeBalance(poolAddress, coreAsssetId)
        const poolTokenBal_before = await node.queryFreeBalance(poolAddress, tokenAsssetId)
        const traderCoreBal_before = await node.queryFreeBalance(traderSeed, coreAsssetId)
        const traderTokenBal_before = await node.queryFreeBalance(traderSeed, tokenAsssetId)

        /**
         * Calculate the estimated core asset spent.
         * - formula: [poolCoreBal + coreAmt(1 - feeRate)] * (poolTokenBal - assetAmountBought) = poolCoreBal * poolTokenBal
         *            coreAmt = [ poolCoreBal * poolTokenBal / (poolTokenBal - assetAmountBought) - poolCoreBal ] / (1 - feeRate)
         *                    = poolCoreBal * assetAmountBought / (poolTokenBal - assetAmountBought) / (1 - feeRate)
         * - result should be rounded up to an integer
         */
        let estimatedCoreSwapAmt = poolCoreBal_before * assetAmountBought / ( poolTokenBal_before - assetAmountBought ) / (1 - exchangeFeeRate)
        estimatedCoreSwapAmt = Math.ceil(estimatedCoreSwapAmt)

        // swap
        const txResult = await cennzx.coreToAssetSwapOutput(traderSeed, tokenAsssetId, assetAmountBought, maxCoreAssetSold)
        assert(txResult.bSucc == true, `Call coreToAssetSwapOutput() failed. [MSG = ${txResult.message}]`)

        // get all balance after tx
        const txFee = txResult.txFee
        const poolCoreBal_after = await node.queryFreeBalance(poolAddress, coreAsssetId)
        const poolTokenBal_after = await node.queryFreeBalance(poolAddress, tokenAsssetId)
        const traderCoreBal_after = await node.queryFreeBalance(traderSeed, coreAsssetId)
        const traderTokenBal_after = await node.queryFreeBalance(traderSeed, tokenAsssetId)

        // check trader's token balance
        expectedValue = BigNumber(traderTokenBal_before).add(assetAmountBought)
        assert( traderTokenBal_after == expectedValue, 
                `Token asset balance is wrong. [Expected = ${expectedValue}, Actual = ${traderTokenBal_after}]` )
        // check trader's core balance
        expectedValue = BigNumber(traderCoreBal_before).minus(estimatedCoreSwapAmt + txFee)
        assert( traderCoreBal_after == expectedValue,
                `Core asset balance is wrong. [Expected = ${expectedValue}, Actual = ${traderCoreBal_after}]`)
        // check core asset balance in exchange address
        expectedValue = BigNumber(estimatedCoreSwapAmt).add(poolCoreBal_before)
        assert( poolCoreBal_after == expectedValue,
                `Exchange core asset balance is wrong.[Expected = ${expectedValue}, Actual = ${poolCoreBal_after}]`)
        // check token asset balance in exchange address
        expectedValue = BigNumber(poolTokenBal_before).minus(assetAmountBought)
        assert( poolTokenBal_after == expectedValue, 
                `Exchange core asset balance is wrong.[Expected = ${expectedValue}, Actual = ${poolTokenBal_after}]` )
    });

    it.only('------Query liquidity and balance', async function() {
        await DiaplayInfo('Alice')
    });

    it('Alice adds new liquility', async function() {
        // TODO: transfer token asset to Alice
    });

    it('Eve only has core token, but swap and transfer token asset to Dave', async function() {
    });

    it.skip('Bob swap token asset with another token asset', async function() {
    });
    
    it('Bob remove liquidity', async function() {
    });
});


async function DiaplayInfo(tokenIssuerSeed) {
            
    console.log('coreAsssetId = ', coreAsssetId)
    console.log('tokenAsssetId = ', tokenAsssetId)

    // let getLiquidityBalance_token = await cennzx.getLiquidityBalance(tokenAsssetId, tokenIssuerSeed)
    // let getTotalLiquidity_token = await cennzx.getTotalLiquidity(tokenAsssetId, tokenIssuerSeed)
    let getExchangeAddress = await cennzx.getExchangeAddress(tokenAsssetId, tokenIssuerSeed)
    let exchangeCoreAsssetBal = await node.queryFreeBalance(getExchangeAddress, coreAsssetId)
    let exchangeTokenAsssetBal = await node.queryFreeBalance(getExchangeAddress, tokenAsssetId)
    let traderCoreAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
    let traderTokenAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, tokenAsssetId)

    // console.log('getLiquidityBalance_token =',    getLiquidityBalance_token.toString())
    // console.log('getTotalLiquidity_token =',      getTotalLiquidity_token.toString())
    console.log('getExchangeAddress =',     getExchangeAddress.toString())
    console.log('exchangeCoreAsssetBal =',  exchangeCoreAsssetBal.toString())
    console.log('exchangeTokenAsssetBal =', exchangeTokenAsssetBal.toString())
    console.log(`traderCoreAsssetBal = ${tokenIssuerSeed}`,    traderCoreAsssetBal.toString())
    console.log(`traderTokenAsssetBal = ${tokenIssuerSeed}`,   traderTokenAsssetBal.toString())
    console.log('-------------------')
}
