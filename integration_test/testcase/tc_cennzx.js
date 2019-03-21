"use strict";

const assert = require('chai').assert
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

    /**
     * This is the first 
     */
    it.only('Bob creates pool and liquidity for a new token - 1st time to call addLiquidity()', async function() {
        
        const minLiquidityWanted    = 2
        const maxAssetAmountInput   = 100000
        const coreAmountInput       = 200000

        // create new token
        tokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenTotalAmount)).assetId.toString()

        const traderTokenAsssetBal_before = await node.queryFreeBalance(tokenIssuerSeed, tokenAsssetId)
        const traderCoreAsssetBal_before = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)

        // first add the liquidity
        const txResult = await cennzx.addLiquidity(tokenIssuerSeed, tokenAsssetId, minLiquidityWanted, maxAssetAmountInput, coreAmountInput)
        assert(txResult.bSucc, `Call addLiquidity() failed. [MSG = ${txResult.message}]`)

        const txFee = txResult.txFee

        const traderTokenAsssetBal_after    = await node.queryFreeBalance(tokenIssuerSeed, tokenAsssetId)
        const traderCoreAsssetBal_after     = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
        const poolAddress                   = await cennzx.getExchangeAddress(tokenAsssetId, tokenIssuerSeed)
        const poolCoreAsssetBal         = await node.queryFreeBalance(poolAddress, coreAsssetId)
        const poolTokenAsssetBal        = await node.queryFreeBalance(poolAddress, tokenAsssetId)

        // check issuer's token balance
        assert.equal( traderTokenAsssetBal_after, traderTokenAsssetBal_before - maxAssetAmountInput, 
                    `Token asset balance is wrong.` )
        // check issuer's core balance
        // assert.equal( BigNumber(traderCoreAsssetBal_before).minus(traderCoreAsssetBal_after) == coreAmountInput + txFee, 
        assert.equal( traderCoreAsssetBal_after, BigNumber(traderCoreAsssetBal_before).minus(coreAmountInput + txFee), 
                    `Core asset balance is wrong.` )
        // check liquidity balance
        // assert.equal( liquidityBalance == coreAmountInput, `Liquidity balance is wrong.[Expected = ${maxAssetAmountInput}, Actual = ${liquidityBalance}]` )
        // check total liquidity
        // assert.equal( totalLiquidity == coreAmountInput, `Total liquidity is wrong.[Expected = ${maxAssetAmountInput}, Actual = ${totalLiquidity}]` )
        // check core asset balance in exchange address
        assert.equal( poolCoreAsssetBal, coreAmountInput, 
                    `Exchange core asset balance is wrong.` )
        // check token asset balance in exchange address
        assert.equal( poolTokenAsssetBal, maxAssetAmountInput, 
                    `Exchange token asset balance is wrong.` )
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
        estimatedCoreSwapAmt = Math.ceil(estimatedCoreSwapAmt)  // round up: remove digitals and add 1

        // swap core to token
        const txResult = await cennzx.coreToAssetSwapOutput(traderSeed, tokenAsssetId, assetAmountBought, maxCoreAssetSold)
        assert(txResult.bSucc, `Call coreToAssetSwapOutput() failed. [MSG = ${txResult.message}]`)

        // get all balance after tx
        const txFee = txResult.txFee
        const poolCoreBal_after = await node.queryFreeBalance(poolAddress, coreAsssetId)
        const poolTokenBal_after = await node.queryFreeBalance(poolAddress, tokenAsssetId)
        const traderCoreBal_after = await node.queryFreeBalance(traderSeed, coreAsssetId)
        const traderTokenBal_after = await node.queryFreeBalance(traderSeed, tokenAsssetId)

        // check trader's token balance
        expectedValue = BigNumber(traderTokenBal_before).add(assetAmountBought)
        assert.equal( traderTokenBal_after , expectedValue, `Token asset balance is wrong. ` )
        // check trader's core balance
        expectedValue = BigNumber(traderCoreBal_before).minus(estimatedCoreSwapAmt + txFee)
        assert.equal( traderCoreBal_after ,expectedValue, `Core asset balance is wrong. `)
        // check core asset balance in exchange address
        expectedValue = BigNumber(estimatedCoreSwapAmt).add(poolCoreBal_before)
        assert.equal( poolCoreBal_after , expectedValue, `Exchange core asset balance is wrong.`)
        // check token asset balance in exchange address
        expectedValue = BigNumber(poolTokenBal_before).minus(assetAmountBought)
        assert.equal( poolTokenBal_after , expectedValue, `Exchange token asset balance is wrong.` )
    });

    it.only('------Query liquidity and balance', async function() {
        await DiaplayInfo('Alice')
    });

    it.only('Alice adds new liquility - 2nd time to call addLiquidity()', async function() {
        const minLiquidityWanted    = 2
        const maxAssetAmountInput   = 10000
        const coreAmountInput       = 20000
        const traderSeed            = 'Alice'
        

        // get all balances before tx
        const beforeTxBal = new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await beforeTxBal.getAll()

        /**
         * Calculate the estimated token amount that will be deduced.
         * - formular: token_added / token_pool = core_added / core_pool
         *             token_added = token_pool * core_added / core_pool
         */
        let estimatedTokenAddAmt = beforeTxBal.poolTokenAsssetBal * coreAmountInput / beforeTxBal.poolCoreAsssetBal
        estimatedTokenAddAmt = Math.ceil(estimatedTokenAddAmt)  // round up

        // add new liquidity
        const txResult = await cennzx.addLiquidity(traderSeed, tokenAsssetId, minLiquidityWanted, maxAssetAmountInput, coreAmountInput)
        assert(txResult.bSucc, `Call addLiquidity() failed. [MSG = ${txResult.message}]`)

        // get tx fee
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await afterTxBal.getAll()

        let expectedValue = 0
        // check issuer's token balance
        expectedValue = BigNumber(beforeTxBal.traderTokenAssetBal).minus(estimatedTokenAddAmt)
        assert.equal( afterTxBal.traderTokenAssetBal, expectedValue, `Trader's token asset balance is wrong.` )

        // check issuer's core balance
        expectedValue = BigNumber(beforeTxBal.traderCoreAssetBal).minus(coreAmountInput + txFee)
        assert.equal( afterTxBal.traderCoreAssetBal, expectedValue, `Trader's core asset balance is wrong.` )

        // check token amount in pool
        expectedValue = BigNumber(beforeTxBal.poolTokenAsssetBal).add(estimatedTokenAddAmt) 
        assert.equal( afterTxBal.poolTokenAsssetBal , expectedValue, `Exchange token asset balance is wrong.` )

        // check core asset balance in exchange address
        expectedValue = BigNumber(beforeTxBal.poolCoreAsssetBal).add(coreAmountInput)
        assert.equal( afterTxBal.poolCoreAsssetBal , expectedValue, `Exchange core asset balance is wrong.` )
        
    });

    it.only('------Query liquidity and balance', async function() {
        await DiaplayInfo('Alice')
    });

    it('Eve only has core token, but swap and transfer token asset to Dave', async function() {
    });

    it.skip('TODO: Bob swap one token asset with another token asset', async function() {
    });
    
    it('Bob remove liquidity', async function() {
    });
});


async function DiaplayInfo(traderSeed) {
            
    console.log('coreAsssetId = ', coreAsssetId)
    console.log('tokenAsssetId = ', tokenAsssetId)

    let getLiquidityBalance_token = await cennzx.getLiquidityBalance(tokenAsssetId, traderSeed)
    let getLiquidityBalance_token2 = await cennzx.getLiquidityBalance(tokenAsssetId, tokenIssuerSeed)
    let getTotalLiquidity_token = await cennzx.getTotalLiquidity(tokenAsssetId, traderSeed)
    let getExchangeAddress = await cennzx.getExchangeAddress(tokenAsssetId, traderSeed)
    let poolCoreAsssetBal = await node.queryFreeBalance(getExchangeAddress, coreAsssetId)
    let poolTokenAsssetBal = await node.queryFreeBalance(getExchangeAddress, tokenAsssetId)
    let traderCoreAsssetBal = await node.queryFreeBalance(traderSeed, coreAsssetId)
    let traderTokenAsssetBal = await node.queryFreeBalance(traderSeed, tokenAsssetId)

    console.log(`getLiquidityBalance_token = ${traderSeed}`,    getLiquidityBalance_token.toString())
    console.log(`getLiquidityBalance_token = ${tokenIssuerSeed}`,    getLiquidityBalance_token2.toString())
    console.log('getTotalLiquidity_token =',      getTotalLiquidity_token.toString())
    console.log('getExchangeAddress =',     getExchangeAddress.toString())
    console.log('poolCoreAsssetBal =',  poolCoreAsssetBal.toString())
    console.log('poolTokenAsssetBal =', poolTokenAsssetBal.toString())
    console.log(`traderCoreAsssetBal = ${traderSeed}`,    traderCoreAsssetBal.toString())
    console.log(`traderTokenAsssetBal = ${traderSeed}`,   traderTokenAsssetBal.toString())
    console.log('-------------------')
}

/**
 * Class for save all relevant balances that will be verified
 */
class CennzXBalance{

    constructor(traderSeed = null, tokenId = -1, coreId = -1){
        this.traderSeed             = traderSeed
        this.tokenId                = tokenId
        this.coreId                 = coreId
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
        this.traderCoreAssetBal     = await node.queryFreeBalance(this.traderSeed, this.coreId)
    }
}