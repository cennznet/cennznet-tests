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

describe('TODO:(await new version release) CennzX test suite', function () {
    
    before( async function(){
        await node.topupTestAccount()    // only for remote test

        // create new token
        tokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenTotalAmount)).assetId.toString()
        // get core asset id
        coreAsssetId = (await cennzx.getCoreAssetId()).toString()

        let feeRate = (await cennzx.getFeeRate()).toString()
        exchangeFeeRate = parseInt(feeRate) / 1000000.0     // the feeRate is for per mill
    })

    after(function(){
    })

    it('Bob creates pool and liquidity for a new token - 1st time to call addLiquidity()', async function() {
        
        const traderSeed = tokenIssuerSeed // Bob
        const minLiquidityWanted    = 2
        const maxAssetAmountInput   = 100000
        const coreAmountInput       = 200000

        // get all balances before tx
        const beforeTxBal = await new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await beforeTxBal.getAll()

        // first add the liquidity
        const txResult = await cennzx.addLiquidity(traderSeed, tokenAsssetId, minLiquidityWanted, maxAssetAmountInput, coreAmountInput)
        assert(txResult.bSucc, `Call addLiquidity() failed. [MSG = ${txResult.message}]`)

        // get tx fee
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = await new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await afterTxBal.getAll()

        // check issuer's token balance
        assert.equal( 
            afterTxBal.traderTokenAssetBal, 
            beforeTxBal.traderTokenAssetBal - maxAssetAmountInput, 
            `Token asset balance is wrong.` )
        // check issuer's core balance
        assert.equal( 
            afterTxBal.traderCoreAssetBal, 
            BigNumber(beforeTxBal.traderCoreAssetBal).minus(coreAmountInput + txFee).toString(), 
            `Core asset balance is wrong.` )
        // check core asset balance in exchange address
        assert.equal( afterTxBal.poolCoreAsssetBal, coreAmountInput, 
                    `Exchange core asset balance is wrong.` )
        // check token asset balance in exchange address
        assert.equal( afterTxBal.poolTokenAsssetBal, maxAssetAmountInput, 
                    `Exchange token asset balance is wrong.` )
        
        // check total liquidity
        assert.equal( afterTxBal.totalLiquidity , coreAmountInput, `Total liquidity is wrong.` )

        // check trader liquidity
        assert.equal( afterTxBal.traderLiquidity , coreAmountInput, `Trader's liquidity is wrong.` )
    });

    it('Alice swap core asset to token asset', async function() {
        const traderSeed = 'Alice'
        const tokenAmountBought = 14005
        const maxCoreAssetSold = 200000

        // get all balances before tx
        const beforeTxBal = new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await beforeTxBal.getAll()

        // call getCoreToAssetOutputPrice() to verify its value
        const coreToTokenPrice = await cennzx.getCoreToAssetOutputPrice(tokenAsssetId, tokenAmountBought, traderSeed)

        // swap core to token
        const txResult = await cennzx.coreToAssetSwapOutput(traderSeed, tokenAsssetId, tokenAmountBought, maxCoreAssetSold)
        assert(txResult.bSucc, `Call coreToAssetSwapOutput() failed. [MSG = ${txResult.message}]`)

        // get all balance after tx
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await afterTxBal.getAll()

        /**
         * Calculate the estimated core asset spen
         * - formula: [poolCoreBal + coreAmt] * (poolTokenBal - tokenAmountBought) = poolCoreBal * poolTokenBal
         *            coreAmt = [ poolCoreBal * poolTokenBal / (poolTokenBal - tokenAmountBought) - poolCoreBal ]
         *            finalCoreCost = coreAmt ( 1 + feeRate )
         * - [coreAmt] should be rounded up to an integer, but [finalCoreCost] not
         */
        let finalCoreSpent = beforeTxBal.poolCoreAsssetBal * tokenAmountBought / ( beforeTxBal.poolTokenAsssetBal - tokenAmountBought )
        finalCoreSpent = Math.ceil(finalCoreSpent)
        // add fee
        finalCoreSpent = Math.floor( finalCoreSpent * ( 1 + exchangeFeeRate))

        // check query price and excepted price
        assert.equal( 
            coreToTokenPrice , 
            finalCoreSpent, 
            `Value from getCoreToAssetOutputPrice() is wrong. ` )

        // check trader's token balance
        assert.equal( 
            afterTxBal.traderTokenAssetBal , 
            BigNumber(beforeTxBal.traderTokenAssetBal).add(tokenAmountBought).toString(), 
            `Token asset balance is wrong. ` )
        // check trader's core balance
        assert.equal( 
            afterTxBal.traderCoreAssetBal,
            BigNumber(beforeTxBal.traderCoreAssetBal).minus(finalCoreSpent + txFee).toString(), 
            `Core asset balance is wrong. `)
        // check core asset balance in exchange address
        assert.equal( 
            afterTxBal.poolCoreAsssetBal, 
            BigNumber(beforeTxBal.poolCoreAsssetBal).add(finalCoreSpent).toString(), 
            `Exchange core asset balance is wrong.`)
        // check token asset balance in exchange address
        assert.equal( 
            afterTxBal.poolTokenAsssetBal , 
            BigNumber(beforeTxBal.poolTokenAsssetBal).minus(tokenAmountBought).toString(), 
            `Exchange token asset balance is wrong.` )

        // check total liquidity
        assert.equal( afterTxBal.totalLiquidity , beforeTxBal.totalLiquidity, `Total liquidity is wrong.` )
        // check trader liquidity
        assert.equal( afterTxBal.traderLiquidity , afterTxBal.traderLiquidity, `Trader's liquidity is wrong.` )
    });

    it('Alice adds new liquility - 2nd time to call addLiquidity()', async function() {
        const minLiquidityWanted    = 2
        const maxAssetAmountInput   = 10000
        const coreAmountInput       = 20000
        const traderSeed            = 'Alice'

        // get all balances before tx
        const beforeTxBal = new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await beforeTxBal.getAll()

        // add new liquidity
        const txResult = await cennzx.addLiquidity(traderSeed, tokenAsssetId, minLiquidityWanted, maxAssetAmountInput, coreAmountInput)
        assert(txResult.bSucc, `Call addLiquidity() failed. [MSG = ${txResult.message}]`)

        // get tx fee
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await afterTxBal.getAll()


        /**
         * Calculate the estimated token amount added to pool.
         * - formular: token_added / token_pool = core_added / core_pool
         *             => token_added = token_pool * core_added / core_pool
         */
        let estimatedTokenAmtAdded = beforeTxBal.poolTokenAsssetBal * coreAmountInput / beforeTxBal.poolCoreAsssetBal
        estimatedTokenAmtAdded = Math.ceil(estimatedTokenAmtAdded)  // round up

        /**
         * Calculate the estimated liquidity increased
         * - formular: liquidity_minted = core_added * total_liquidity / core_pool
         * - note: the result should remove the digitals. (For all actions to add property into individual's account)
         */
        let estimatedLiquidityMinted = coreAmountInput * beforeTxBal.totalLiquidity / beforeTxBal.poolCoreAsssetBal
        estimatedLiquidityMinted = Math.floor(estimatedLiquidityMinted)  // round, only remove the digitals

        // check issuer's token balance
        assert.equal( 
            afterTxBal.traderTokenAssetBal, 
            BigNumber(beforeTxBal.traderTokenAssetBal).minus(estimatedTokenAmtAdded).toString(), 
            `Trader's token asset balance is wrong.` )

        // check issuer's core balance
        assert.equal( 
            afterTxBal.traderCoreAssetBal, 
            BigNumber(beforeTxBal.traderCoreAssetBal).minus(coreAmountInput + txFee).toString(), 
            `Trader's core asset balance is wrong.` )

        // check token amount in pool
        assert.equal( 
            afterTxBal.poolTokenAsssetBal , 
            BigNumber(beforeTxBal.poolTokenAsssetBal).add(estimatedTokenAmtAdded).toString(), 
            `Pool token asset balance is wrong.` )

        // check core asset balance in exchange address
        assert.equal( 
            afterTxBal.poolCoreAsssetBal , 
            BigNumber(beforeTxBal.poolCoreAsssetBal).add(coreAmountInput).toString(), 
            `Pool core asset balance is wrong.` )

        // check total liquidity
        assert.equal( 
            afterTxBal.totalLiquidity , 
            BigNumber(beforeTxBal.totalLiquidity).add(estimatedLiquidityMinted).toString(), 
            `Total liquidity is wrong.` )

        // check trader liquidity
        assert.equal( 
            afterTxBal.traderLiquidity , 
            BigNumber(beforeTxBal.traderLiquidity ).add( estimatedLiquidityMinted ).toString(), 
            `Trader's liquidity is wrong.` )
        
    });

    it('Eve (only has core asset) transfers token asset to Dave', async function() {
        
        const maxCoreSold           = 1000000
        const tokenAmountBought     = 15000
        const traderSeed            = 'Eve'
        const reciepent             = 'Dave'

        // get all balances before tx
        const beforeTxBal = new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await beforeTxBal.getAll()

        // get reciepent's token balance
        const reciepentTokenBal_beforeTx = await node.queryFreeBalance(reciepent, tokenAsssetId)

        // swap and transfer.
        const txResult = await cennzx.coreToAssetTransferOutput(traderSeed, reciepent, tokenAsssetId, tokenAmountBought, maxCoreSold)
        assert(txResult.bSucc, `Call coreToAssetTransferOutput() failed. [MSG = ${txResult.message}]`)

        // get tx fee
        const txFee = txResult.txFee
        console.log('txFee =', txFee)

        // get all balances after tx
        const afterTxBal = new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await afterTxBal.getAll()

        // get reciepent's token balance
        const reciepentTokenBal_afterTx = await node.queryFreeBalance(reciepent, tokenAsssetId)
        console.log('reciepentTokenBal_afterTx =', reciepentTokenBal_afterTx)

        /**
         * Calculate the estimated core asset spent.
         * - formula: [poolCoreBal + coreAmt(1 - feeRate)] * (poolTokenBal - tokenAmountBought) = poolCoreBal * poolTokenBal
         *            coreAmt = [ poolCoreBal * poolTokenBal / (poolTokenBal - tokenAmountBought) - poolCoreBal ] / (1 - feeRate)
         *                    = poolCoreBal * tokenAmountBought / (poolTokenBal - tokenAmountBought) / (1 - feeRate)
         * - result should be rounded up to an integer
         */
        let finalCoreSpent = beforeTxBal.poolCoreAsssetBal * tokenAmountBought / ( beforeTxBal.poolTokenAsssetBal - tokenAmountBought )
        finalCoreSpent = Math.ceil(finalCoreSpent)
        // add fee
        finalCoreSpent = Math.floor( finalCoreSpent * ( 1 + exchangeFeeRate))
        console.log('finalCoreSpent =', finalCoreSpent)

        // check trader's core balance
        assert.equal( 
            afterTxBal.traderCoreAssetBal,
            BigNumber(beforeTxBal.traderCoreAssetBal).minus(finalCoreSpent + txFee).toString(), 
            `Trader's core asset balance is wrong. `)

        // check recipient's token balance
        assert.equal( 
            reciepentTokenBal_afterTx,
            BigNumber(reciepentTokenBal_beforeTx).add(tokenAmountBought).toString(), 
            `Recipient's core asset balance is wrong. `)

        // check core asset balance in exchange address
        assert.equal( 
            afterTxBal.poolCoreAsssetBal, 
            BigNumber(beforeTxBal.poolCoreAsssetBal).add(finalCoreSpent).toString(), 
            `Exchange core asset balance is wrong.`)

        // check token asset balance in exchange address
        assert.equal( 
            afterTxBal.poolTokenAsssetBal , 
            BigNumber(beforeTxBal.poolTokenAsssetBal).minus(tokenAmountBought).toString(), 
            `Exchange token asset balance is wrong.` )

        // check total liquidity
        assert.equal( afterTxBal.totalLiquidity , beforeTxBal.totalLiquidity, `Total liquidity is wrong.` )
        // check trader liquidity
        assert.equal( afterTxBal.traderLiquidity , afterTxBal.traderLiquidity, `Trader's liquidity is wrong.` )
    });

    it.skip('TODO: Bob swap one token asset with another token asset', async function() {
    });
    
    it('Bob remove liquidity', async function() {
        

        const traderSeed        = 'Bob' // Bob
        const burnedAmount      = 10000
        const minAssetWithdraw  = 1
        const minCoreWithdraw   = 1

        // await displayInfo(traderSeed)

        // get all balances before tx
        const beforeTxBal = await new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await beforeTxBal.getAll()

        // first add the liquidity
        const txResult = await cennzx.removeLiquidity(traderSeed, tokenAsssetId, burnedAmount, minAssetWithdraw, minCoreWithdraw)
        assert(txResult.bSucc, `Call removeLiquidity() failed. [MSG = ${txResult.message}]`)

        // get tx fee
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = await new CennzXBalance(traderSeed, tokenAsssetId, coreAsssetId)
        await afterTxBal.getAll()


        // await displayInfo(traderSeed)

        // calucate the estimated token amount withdrawn 
        // - formula: coreWithdrawn = corePool * (amountBurned / totalLiquidity)
        let withdrawalTokenAmt = burnedAmount / beforeTxBal.totalLiquidity * beforeTxBal.poolTokenAsssetBal
        withdrawalTokenAmt = Math.floor(withdrawalTokenAmt) // remove digitals
        
        // calucate the estimated core amount withdrawn
        // - formula: tokenWithdrawn = tokenPool * (amountBurned / totalLiquidity)
        let withdrawalCoreAmt = burnedAmount / beforeTxBal.totalLiquidity * beforeTxBal.poolCoreAsssetBal
        withdrawalCoreAmt = Math.floor(withdrawalCoreAmt)   // remove digitals
        
        // check trader's liquidity balance
        assert.equal( 
            afterTxBal.traderLiquidity , 
            BigNumber(beforeTxBal.traderLiquidity).minus(burnedAmount).toString(), 
            `Trader's liquidity balance is wrong.` )

        // check total liquidity
        assert.equal( 
            afterTxBal.totalLiquidity , 
            BigNumber(beforeTxBal.totalLiquidity).minus(burnedAmount).toString(), 
            `Total liquidity balance is wrong.` )

        // check pool's core balance
        assert.equal( 
            afterTxBal.poolCoreAsssetBal , 
            BigNumber(beforeTxBal.poolCoreAsssetBal).minus(withdrawalCoreAmt).toString(), 
            `Pool's core balance is wrong.` )

        // check pool's token balance
        assert.equal( 
            afterTxBal.poolTokenAsssetBal , 
            BigNumber(beforeTxBal.poolTokenAsssetBal).minus(withdrawalTokenAmt).toString(), 
            `Pool's token balance is wrong.` )

        // check trader's core balance
        assert.equal( 
            afterTxBal.traderCoreAssetBal , 
            BigNumber(beforeTxBal.traderCoreAssetBal).add(withdrawalCoreAmt).minus(txFee).toString(), 
            `Trader's core balance is wrong.` )

        // check trader's token balance
        assert.equal( 
            afterTxBal.traderTokenAssetBal , 
            BigNumber(beforeTxBal.traderTokenAssetBal).add(withdrawalTokenAmt).toString(), 
            `Trader's token balance is wrong.` )
    });
});


async function displayInfo(traderSeed) {
            
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