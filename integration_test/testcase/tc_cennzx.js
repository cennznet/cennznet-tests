// Copyright 2019 Centrality Investments Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

const assert = require('chai').assert
const cennzx = require('../../api/cennzx')
const ga = require('../../api/ga')
const node = require('../../api/node')
const BigNumber = require('big-number')
const mlog = require('mocha-logger')


var     coreAsssetId        = -1
var     tokenAsssetId_1     = -1
var     tokenAsssetId_2     = -1
var     tokenIssuerSeed     = 'Bob'
const   tokenTotalAmount    = 1000000
var     exchangeFeeRate     = 0

/**
 * Formula for token exchange:
 * -- Buy token: [poolCoreBal + coreAmt] * (poolTokenBal - amountBought) = poolCoreBal * poolTokenBal
 *       @ Buy fixed amount of token: finalCoreCost = coreAmt ( 1 + feeRate )
 *       @ Sell fixed amount of core: coreAmt = totalCoreSellAmount / ( 1 + feeRate )
 *            
 * -- Buy core: [poolCoreBal - coreAmt] * (poolTokenBal + amountBought) = poolCoreBal * poolTokenBal
 *       @ Buy fixed amount of core: finalCoreCost = amountBought ( 1 + feeRate )
 *       @ Sell fixed amount of token: amountBought = totalTokenSellAmount / ( 1 + feeRate )
 * 
 */

describe('CennzX test suite', function () {
    
    before( async function(){

        // get core asset id
        coreAsssetId = (await cennzx.getCoreAssetId()).toString()
        mlog.log('Core asset ID =', coreAsssetId)
        mlog.log('Pool address =', await cennzx.getExchangeAddress(tokenAsssetId_1))

        // create new token_1
        tokenAsssetId_1 = (await ga.createNewToken(tokenIssuerSeed, tokenTotalAmount)).assetId.toString()
        mlog.log('Create new token_1 ID =', tokenAsssetId_1)

        const feeRate = (await cennzx.defaultFeeRate()).toString()
        exchangeFeeRate = feeRate / 1000000.0     // the feeRate is for per mill

        mlog.log('Exchange fee rate =', exchangeFeeRate.toString())

        // create new token_2
        tokenAsssetId_2 = (await ga.createNewToken(tokenIssuerSeed, tokenTotalAmount)).assetId.toString()
        mlog.log('Create new token_2 ID =', tokenAsssetId_2)
        mlog.log('Pool address =', await cennzx.getExchangeAddress(tokenAsssetId_2))

        // create pool for tokenAsssetId_2
        const txResult = await cennzx.addLiquidity(tokenIssuerSeed, tokenAsssetId_2, 2, '100000', '200000')
        assert(txResult.bSucc, `Call addLiquidity() failed. [MSG = ${txResult.message}]`)
        mlog.log(`Created the exchange pool for token ${tokenAsssetId_2}`)
    })

    it.only('Bob creates pool and liquidity for tokenAsssetId_1 [1st time to call addLiquidity()]', async function() {
        
        const traderSeed            = tokenIssuerSeed // Bob
        const minLiquidityWanted    = 2
        const maxAssetAmountInput   = 100000
        const coreAmountInput       = 200000

        // get all balances before tx
        const beforeTxBal = new cennzx.CennzXBalance(traderSeed, tokenAsssetId_1)
        await beforeTxBal.getAll()

        // first add the liquidity for tokenAsssetId_1
        const txResult = await cennzx.addLiquidity(traderSeed, tokenAsssetId_1, minLiquidityWanted, maxAssetAmountInput, coreAmountInput)
        assert(txResult.bSucc, `Call addLiquidity() failed. [MSG = ${txResult.message}]`)

        // get tx fee
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = new cennzx.CennzXBalance(traderSeed, tokenAsssetId_1)
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

    it.only('duplicate => Alice spends core asset to buy fixed tokenAsssetId_1', async function() {
        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetSwapOutput
        mp.traderSeed      = 'Alice'
        mp.assetIdSell     = coreAsssetId
        mp.assetIdBuy      = tokenAsssetId_1
        mp.amountBuy       = '50000'
        mp.maxAmountSell   = '2000000'

        await cennzx.checkMethod(mp)
    });

    it.skip('Alice spends core asset to buy fixed tokenAsssetId_1', async function() {
        const traderSeed        = 'Alice'
        const amountBought      = '50000'
        const maxCoreAssetSold  = '2000000'

        // get all balances before tx
        const beforeTxBal = new cennzx.CennzXBalance(traderSeed, tokenAsssetId_1)
        await beforeTxBal.getAll()

        // get estimated price
        const coreToTokenOutputPrice = await cennzx.getOutputPrice(coreAsssetId, tokenAsssetId_1, amountBought)

        // swap core to token
        const txResult = await cennzx.assetSwapOutput(traderSeed, coreAsssetId, tokenAsssetId_1, amountBought, maxCoreAssetSold)
        assert(txResult.bSucc, `Call assetSwapOutput() failed. [MSG = ${txResult.message}]`)

        // get all balance after tx
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = new cennzx.CennzXBalance(traderSeed, tokenAsssetId_1, coreAsssetId)
        await afterTxBal.getAll()

        /**
         * Calculate the estimated core asset spen
         * - formula: [poolCoreBal + coreAmt] * (poolTokenBal - amountBought) = poolCoreBal * poolTokenBal
         *            coreAmt = [ poolCoreBal * poolTokenBal / (poolTokenBal - amountBought) - poolCoreBal ]
         *            finalCoreCost = coreAmt ( 1 + feeRate )
         * - [coreAmt] should be rounded up to an integer, but [finalCoreCost] not
         */
        /*
        let finalCoreSpent2 = beforeTxBal.poolCoreAsssetBal * amountBought / ( beforeTxBal.poolTokenAsssetBal - amountBought )
        finalCoreSpent2 = Math.ceil(finalCoreSpent2)
        // add fee
        finalCoreSpent2 = Math.floor( finalCoreSpent2 * ( 1 + exchangeFeeRate))

        // check query price and excepted price
        assert.equal( 
            coreToTokenPrice , 
            finalCoreSpent, 
            `Value from getOutputPrice() is wrong. ` )
        */

        // check trader's token balance
        assert.equal( 
            afterTxBal.traderTokenAssetBal.toString() , 
            BigNumber(beforeTxBal.traderTokenAssetBal).add(amountBought).toString(), 
            `Token asset balance is wrong. ` )
        // check trader's core balance
        assert.equal( 
            afterTxBal.traderCoreAssetBal.toString(),
            BigNumber(beforeTxBal.traderCoreAssetBal).minus(coreToTokenOutputPrice).minus(txFee).toString(), 
            `Trader's core asset balance is wrong. `)
        // check core asset balance in exchange address
        assert.equal( 
            afterTxBal.poolCoreAsssetBal.toString(), 
            BigNumber(beforeTxBal.poolCoreAsssetBal).add(coreToTokenOutputPrice).toString(), 
            `Exchange core asset balance is wrong.`)
        // check token asset balance in exchange address
        assert.equal( 
            afterTxBal.poolTokenAsssetBal.toString() , 
            BigNumber(beforeTxBal.poolTokenAsssetBal).minus(amountBought).toString(), 
            `Exchange token asset balance is wrong.` )

        // check total liquidity
        assert.equal( afterTxBal.totalLiquidity.toString() , beforeTxBal.totalLiquidity.toString(), `Total liquidity is wrong.` )
        // check trader liquidity
        assert.equal( afterTxBal.traderLiquidity.toString() , afterTxBal.traderLiquidity.toString(), `Trader's liquidity is wrong.` )
    });

    it('duplicate => Alice sells fixed core asset to buy tokenAsssetId_1', async function() {
        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetSwapInput
        mp.traderSeed      = 'Alice'
        mp.assetIdSell     = coreAsssetId
        mp.assetIdBuy      = tokenAsssetId_1
        mp.amountSell      = '10000'
        mp.minAmountBuy    = '2'

        await cennzx.checkMethod(mp)
        
    });

    it.skip('Alice sells fixed core asset to buy tokenAsssetId_1', async function() {
        const traderSeed        = 'Alice'
        const assetIdSold       = coreAsssetId
        const assetIdBought     = tokenAsssetId_1 
        const amountSell        = '10000'
        const minReceive        = '2'

        // get all balances before tx
        const beforeTxBal = new cennzx.CennzXBalance(traderSeed, assetIdBought)
        await beforeTxBal.getAll()

        await beforeTxBal.displayInfo()

        // get estimated price
        const coreToTokenInputPrice = await cennzx.getInputPrice(assetIdSold, assetIdBought, amountSell)
        console.log('coreToTokenInputPrice =', coreToTokenInputPrice)

        // swap core to token
        const txResult = await cennzx.assetSwapInput(traderSeed, assetIdSold, assetIdBought, amountSell, minReceive)
        assert(txResult.bSucc, `Call assetSwapOutput() failed. [MSG = ${txResult.message}]`)

        // get all balance after tx
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = new cennzx.CennzXBalance(traderSeed, assetIdBought)
        await afterTxBal.getAll()

        await afterTxBal.displayInfo()

        // check trader's token balance
        assert.equal( 
            afterTxBal.traderTokenAssetBal.toString(), 
            BigNumber(beforeTxBal.traderTokenAssetBal).add(coreToTokenInputPrice).toString(), 
            `Trader's token asset balance is wrong. ` )
        // check trader's core balance
        assert.equal( 
            afterTxBal.traderCoreAssetBal.toString(),
            BigNumber(beforeTxBal.traderCoreAssetBal).minus(amountSell).minus(txFee).toString(), 
            `Trader's core asset balance is wrong. `)
        // check core asset balance in exchange address
        assert.equal( 
            afterTxBal.poolCoreAsssetBal.toString(), 
            BigNumber(beforeTxBal.poolCoreAsssetBal).add(amountSell).toString(), 
            `Exchange core asset balance is wrong.`)
        // check token asset balance in exchange address
        assert.equal( 
            afterTxBal.poolTokenAsssetBal.toString() , 
            BigNumber(beforeTxBal.poolTokenAsssetBal).minus(coreToTokenInputPrice).toString(), 
            `Exchange token asset balance is wrong.` )

        // check total liquidity
        assert.equal( afterTxBal.totalLiquidity.toString() , beforeTxBal.totalLiquidity.toString(), `Total liquidity is wrong.` )
        // check trader liquidity
        assert.equal( afterTxBal.traderLiquidity.toString() , afterTxBal.traderLiquidity.toString(), `Trader's liquidity is wrong.` )
    });

    it('Alice spends tokenAsssetId_1 to buy fixed core asset ', async function() {

        const traderSeed       = 'Alice'
        const assetIdSold      = tokenAsssetId_1
        const assetIdBought    = coreAsssetId
        const amountBought     = '10000'
        const maxAmountSold    = '20000'


        // top up asset account
        await node.transfer(tokenIssuerSeed, traderSeed, maxAmountSold, assetIdSold)

        // get all balances before tx
        const beforeTxBal = new cennzx.CennzXBalance(traderSeed, tokenAsssetId_1)
        await beforeTxBal.getAll()
        await beforeTxBal.displayInfo()

        // get estimated price
        const tokenToCoreOutputPrice = await cennzx.getOutputPrice(assetIdSold, assetIdBought, amountBought)
        console.log('token2CoreOutputPrice = ', tokenToCoreOutputPrice)

        // swap core to token
        const txResult = await cennzx.assetSwapOutput(traderSeed, assetIdSold, assetIdBought, amountBought, maxAmountSold)
        assert(txResult.bSucc, `Call assetSwapOutput() failed. [MSG = ${txResult.message}]`)

        // get all balance after tx
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = new cennzx.CennzXBalance(traderSeed, tokenAsssetId_1, coreAsssetId)
        await afterTxBal.getAll()
        await afterTxBal.displayInfo()

        // check trader's token balance
        assert.equal( 
            afterTxBal.traderTokenAssetBal.toString() , 
            BigNumber(beforeTxBal.traderTokenAssetBal).minus(tokenToCoreOutputPrice).toString(), 
            `Token asset balance is wrong. ` )
        // check trader's core balance
        assert.equal( 
            afterTxBal.traderCoreAssetBal.toString(),
            BigNumber(beforeTxBal.traderCoreAssetBal).add(amountBought).minus(txFee).toString(), 
            `Trader's core asset balance is wrong. `)
        // check core asset balance in exchange address
        assert.equal( 
            afterTxBal.poolCoreAsssetBal.toString(), 
            BigNumber(beforeTxBal.poolCoreAsssetBal).minus(amountBought).toString(), 
            `Exchange core asset balance is wrong.`)
        // check token asset balance in exchange address
        assert.equal( 
            afterTxBal.poolTokenAsssetBal.toString() , 
            BigNumber(beforeTxBal.poolTokenAsssetBal).add(tokenToCoreOutputPrice).toString(), 
            `Exchange token asset balance is wrong.` )

        // check total liquidity
        assert.equal( afterTxBal.totalLiquidity.toString() , beforeTxBal.totalLiquidity.toString(), `Total liquidity is wrong.` )
        // check trader liquidity
        assert.equal( afterTxBal.traderLiquidity.toString() , afterTxBal.traderLiquidity.toString(), `Trader's liquidity is wrong.` )
    });

    it('Alice sells fixed tokenAsssetId_1 to buy core asset ', async function() {

        const traderSeed        = 'Alice'
        const assetIdSold       = tokenAsssetId_1
        const assetIdBought     = coreAsssetId
        const amountSell        = '5000'
        const minReceive        = '2'

        // top up asset account
        // await node.transfer(tokenIssuerSeed, traderSeed, maxAmountSold, assetIdSold)

        // get all balances before tx
        const beforeTxBal = new cennzx.CennzXBalance(traderSeed, assetIdSold)
        await beforeTxBal.getAll()
        await beforeTxBal.displayInfo()

        // get estimated price
        const core2Token_inputPrice = await cennzx.getInputPrice(assetIdSold, assetIdBought, amountSell)
        console.log('core2Token_inputPrice = ', core2Token_inputPrice)

        // swap core to token
        const txResult = await cennzx.assetSwapInput(traderSeed, assetIdSold, assetIdBought, amountSell, minReceive)
        assert(txResult.bSucc, `Call assetSwapInput() failed. [MSG = ${txResult.message}]`)

        // get all balance after tx
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = new cennzx.CennzXBalance(traderSeed, assetIdSold)
        await afterTxBal.getAll()
        await afterTxBal.displayInfo()

        // check trader's token balance
        assert.equal( 
            afterTxBal.traderTokenAssetBal.toString(), 
            BigNumber(beforeTxBal.traderTokenAssetBal).minus(amountSell).toString(), 
            `Trader's token asset balance is wrong. ` )
        // check trader's core balance
        assert.equal( 
            afterTxBal.traderCoreAssetBal.toString(),
            BigNumber(beforeTxBal.traderCoreAssetBal).add(core2Token_inputPrice).minus(txFee).toString(), 
            `Trader's core asset balance is wrong. `)
        // check core asset balance in exchange address
        assert.equal( 
            afterTxBal.poolCoreAsssetBal.toString(), 
            BigNumber(beforeTxBal.poolCoreAsssetBal).minus(core2Token_inputPrice).toString(), 
            `Exchange core asset balance is wrong.`)
        // check token asset balance in exchange address
        assert.equal( 
            afterTxBal.poolTokenAsssetBal.toString() , 
            BigNumber(beforeTxBal.poolTokenAsssetBal).add(amountSell).toString(), 
            `Exchange token asset balance is wrong.` )

        // check total liquidity
        assert.equal( afterTxBal.totalLiquidity.toString() , beforeTxBal.totalLiquidity.toString(), `Total liquidity is wrong.` )
        // check trader liquidity
        assert.equal( afterTxBal.traderLiquidity.toString() , afterTxBal.traderLiquidity.toString(), `Trader's liquidity is wrong.` )
    });

    it(`Alice spends 'tokenAsssetId_2' to buy fixed 'tokenAsssetId_1'`, async function() {

        const traderSeed       = 'Alice'
        const assetIdSold      = tokenAsssetId_2
        const assetIdBought    = tokenAsssetId_1
        const amountBought     = '1000'
        const maxAmountSold    = '20000'

        // top up asset account
        await node.transfer(tokenIssuerSeed, traderSeed, maxAmountSold, assetIdSold)

        // get all balances before tx
        const assetSoldBal_beforeTx = new cennzx.CennzXBalance(traderSeed, assetIdSold)
        const assetBoughtBal_beforeTx = new cennzx.CennzXBalance(traderSeed, assetIdBought)
        await assetSoldBal_beforeTx.getAll()
        await assetBoughtBal_beforeTx.getAll()

        await assetSoldBal_beforeTx.displayInfo()
        await assetBoughtBal_beforeTx.displayInfo()

        // get estimated price
        const swapPrice = await cennzx.getOutputPrice(assetIdSold, assetIdBought, amountBought)
        console.log(`swapPrice ${assetIdSold} -> ${assetIdBought}=`, swapPrice)
        console.log(`swapPrice ${assetIdBought} -> ${assetIdSold}=`, await cennzx.getOutputPrice(assetIdBought, assetIdSold, amountBought))

        const coreToAssetBought_price = await cennzx.getOutputPrice(coreAsssetId, assetIdBought, amountBought)

        // test --->
        const assetSoldToCore_price = await cennzx.getOutputPrice(assetIdSold, coreAsssetId, coreToAssetBought_price)
        console.log('coreToAssetBought_price =', coreToAssetBought_price)
        console.log('assetSoldToCore_price =', assetSoldToCore_price)
        // <---

        // swap core to token
        const txResult = await cennzx.assetSwapOutput(traderSeed, assetIdSold, assetIdBought, amountBought, maxAmountSold)
        assert(txResult.bSucc, `Call assetSwapOutput() failed. [MSG = ${txResult.message}]`)

        // get all balance after tx
        const txFee = txResult.txFee
        console.log('txFee =', txFee)

        // get all balances after tx
        const assetSoldBal_afterTx = new cennzx.CennzXBalance(traderSeed, assetIdSold)
        const assetBoughtBal_afterTx = new cennzx.CennzXBalance(traderSeed, assetIdBought)
        await assetSoldBal_afterTx.getAll()
        await assetBoughtBal_afterTx.getAll()

        await assetSoldBal_afterTx.displayInfo()
        await assetBoughtBal_afterTx.displayInfo()

        // check trader's assetSold balance
        assert.equal( 
            assetSoldBal_afterTx.traderTokenAssetBal , 
            BigNumber(assetSoldBal_beforeTx.traderTokenAssetBal).minus(swapPrice).toString(), 
            `Trader's assetSold(${assetIdSold}) balance is wrong.` )
        // check trader's assetBought balance
        assert.equal( 
            assetBoughtBal_afterTx.traderTokenAssetBal , 
            BigNumber(assetBoughtBal_beforeTx.traderTokenAssetBal).add(amountBought).toString(), 
            `Trader's assetBought(${assetIdBought}) balance is wrong.` )
        // check trader's core asset balance
        assert.equal( 
            assetBoughtBal_afterTx.traderCoreAssetBal,
            BigNumber(assetBoughtBal_beforeTx.traderCoreAssetBal).minus(txFee).toString(), 
            `Trader's core asset(${coreAsssetId}) balance is wrong.`)

        // check core asset balance in assetSold exchange pool
        assert.equal( 
            assetSoldBal_afterTx.poolCoreAsssetBal, 
            BigNumber(assetSoldBal_beforeTx.poolCoreAsssetBal).minus(coreToAssetBought_price).toString(), 
            `Core asset balance is wrong in assetSold(${assetIdSold}) exchange pool.`)
        // check assetSold balance in assetSold exchange pool
        assert.equal( 
            assetSoldBal_afterTx.poolTokenAsssetBal , 
            BigNumber(assetSoldBal_beforeTx.poolTokenAsssetBal).add(swapPrice).toString(), 
            `AssetSold(${assetIdSold}) balance is wrong in its exchange pool.` )

        // check core asset balance in assetBought exchange pool
        assert.equal( 
            assetBoughtBal_afterTx.poolCoreAsssetBal, 
            BigNumber(assetBoughtBal_beforeTx.poolCoreAsssetBal).add(coreToAssetBought_price).toString(), 
            `Exchange core asset balance is wrong.`)
        // check assetBought balance in assetBought exchange pool
        assert.equal( 
            assetBoughtBal_afterTx.poolTokenAsssetBal , 
            BigNumber(assetBoughtBal_beforeTx.poolTokenAsssetBal).minus(amountBought).toString(), 
            `Exchange token asset balance is wrong.` )

        // check total liquidity for assetSold
        assert.equal( assetSoldBal_afterTx.totalLiquidity , assetSoldBal_beforeTx.totalLiquidity, `Total liquidity of assetSold is wrong.` )
        // check trader liquidity for assetSold
        assert.equal( assetSoldBal_afterTx.traderLiquidity , assetSoldBal_beforeTx.traderLiquidity, `Trader's liquidity assetSold is wrong.` )

        // check total liquidity for assetBought
        assert.equal( assetBoughtBal_afterTx.totalLiquidity , assetBoughtBal_beforeTx.totalLiquidity, `Total liquidity of assetBought is wrong.` )
        // check trader liquidity for token_2
        assert.equal( assetBoughtBal_afterTx.traderLiquidity , assetBoughtBal_beforeTx.traderLiquidity, `Trader's liquidity of assetBought is wrong.` )
    });

    it(`Alice sells fixed 'tokenAsssetId_2' to buy 'tokenAsssetId_1'`, async function() {

        const traderSeed       = 'Alice'
        const assetIdSold      = tokenAsssetId_2
        const assetIdBought    = tokenAsssetId_1
        const amountSell       = '5000'
        const minReceive       = '2'

        // top up asset account
        await node.transfer(tokenIssuerSeed, traderSeed, amountSell, assetIdSold)

        // get all balances before tx
        const assetSoldBal_beforeTx = new cennzx.CennzXBalance(traderSeed, assetIdSold)
        const assetBoughtBal_beforeTx = new cennzx.CennzXBalance(traderSeed, assetIdBought)
        await assetSoldBal_beforeTx.getAll()
        await assetBoughtBal_beforeTx.getAll()

        // await assetSoldBal_beforeTx.displayInfo()
        // await assetBoughtBal_beforeTx.displayInfo()

        // query swap price
        const token2ToToken1_inputPrice = await cennzx.getInputPrice(assetIdSold, assetIdBought, amountSell)
        const token2ToCore_inputPrice = await cennzx.getInputPrice(assetIdSold, coreAsssetId, amountSell)

        // swap core to token
        const txResult = await cennzx.assetSwapInput(traderSeed, assetIdSold, assetIdBought, amountSell, minReceive)
        assert(txResult.bSucc, `Call assetSwapInput() failed. [MSG = ${txResult.message}]`)

        // get all balance after tx
        const txFee = txResult.txFee
        // console.log('txFee =', txFee)

        // get all balances after tx
        const assetSoldBal_afterTx = new cennzx.CennzXBalance(traderSeed, assetIdSold)
        const assetBoughtBal_afterTx = new cennzx.CennzXBalance(traderSeed, assetIdBought)
        await assetSoldBal_afterTx.getAll()
        await assetBoughtBal_afterTx.getAll()

        // await assetSoldBal_afterTx.displayInfo()
        // await assetBoughtBal_afterTx.displayInfo()

        // check trader's assetSold balance
        assert.equal( 
            assetSoldBal_afterTx.traderTokenAssetBal , 
            BigNumber(assetSoldBal_beforeTx.traderTokenAssetBal).minus(amountSell).toString(), 
            `Trader's assetSold(${assetIdSold}) balance is wrong.` )
        // check trader's assetBought balance
        assert.equal( 
            assetBoughtBal_afterTx.traderTokenAssetBal , 
            BigNumber(assetBoughtBal_beforeTx.traderTokenAssetBal).add(token2ToToken1_inputPrice).toString(), 
            `Trader's assetBought(${assetIdBought}) balance is wrong.` )
        // check trader's core asset balance
        assert.equal( 
            assetBoughtBal_afterTx.traderCoreAssetBal,
            BigNumber(assetBoughtBal_beforeTx.traderCoreAssetBal).minus(txFee).toString(), 
            `Trader's core asset(${coreAsssetId}) balance is wrong.`)

        // check core asset balance in assetSold exchange pool
        assert.equal( 
            assetSoldBal_afterTx.poolCoreAsssetBal, 
            BigNumber(assetSoldBal_beforeTx.poolCoreAsssetBal).minus(token2ToCore_inputPrice).toString(), 
            `Core asset balance is wrong in assetSold(${assetIdSold}) exchange pool.`)
        // check assetSold balance in assetSold exchange pool
        assert.equal( 
            assetSoldBal_afterTx.poolTokenAsssetBal , 
            BigNumber(assetSoldBal_beforeTx.poolTokenAsssetBal).add(amountSell).toString(), 
            `AssetSold(${assetIdSold}) balance is wrong in its exchange pool.` )

        // check core asset balance in assetBought exchange pool
        assert.equal( 
            assetBoughtBal_afterTx.poolCoreAsssetBal, 
            BigNumber(assetBoughtBal_beforeTx.poolCoreAsssetBal).add(token2ToCore_inputPrice).toString(), 
            `Exchange core asset balance is wrong.`)
        // check assetBought balance in assetBought exchange pool
        assert.equal( 
            assetBoughtBal_afterTx.poolTokenAsssetBal , 
            BigNumber(assetBoughtBal_beforeTx.poolTokenAsssetBal).minus(token2ToToken1_inputPrice).toString(), 
            `Exchange token asset balance is wrong.` )

        // check total liquidity for assetSold
        assert.equal( assetSoldBal_afterTx.totalLiquidity , assetSoldBal_beforeTx.totalLiquidity, `Total liquidity of assetSold is wrong.` )
        // check trader liquidity for assetSold
        assert.equal( assetSoldBal_afterTx.traderLiquidity , assetSoldBal_beforeTx.traderLiquidity, `Trader's liquidity assetSold is wrong.` )

        // check total liquidity for assetBought
        assert.equal( assetBoughtBal_afterTx.totalLiquidity , assetBoughtBal_beforeTx.totalLiquidity, `Total liquidity of assetBought is wrong.` )
        // check trader liquidity for token_2
        assert.equal( assetBoughtBal_afterTx.traderLiquidity , assetBoughtBal_beforeTx.traderLiquidity, `Trader's liquidity of assetBought is wrong.` )
    });

    it('Alice adds new liquility into tokenAsssetId_1 [2nd time to call addLiquidity()]', async function() {
        const minLiquidityWanted    = 2
        const maxAssetAmountInput   = 10000
        const coreAmountInput       = 20000
        const traderSeed            = 'Alice'

        // get all balances before tx
        const beforeTxBal = new cennzx.CennzXBalance(traderSeed, tokenAsssetId_1, coreAsssetId)
        await beforeTxBal.getAll()

        // await displayInfo(traderSeed)

        // add new liquidity
        const txResult = await cennzx.addLiquidity(traderSeed, tokenAsssetId_1, minLiquidityWanted, maxAssetAmountInput, coreAmountInput)
        assert(txResult.bSucc, `Call addLiquidity() failed. [MSG = ${txResult.message}]`)

        // await displayInfo(traderSeed)

        // get tx fee
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = new cennzx.CennzXBalance(traderSeed, tokenAsssetId_1, coreAsssetId)
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

    it.only(`duplicate => Eve spends 'tokenAsssetId_2' to transfer fixed 'tokenAsssetId_1' to Dave`, async function() {

        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetSwapOutput
        mp.traderSeed      = 'Eve'
        mp.recipient       = 'Dave'
        mp.assetIdSell     = tokenAsssetId_2
        mp.assetIdBuy      = tokenAsssetId_1
        mp.amountBuy       = '1000'
        mp.maxAmountSell   = '20000'

        // top up assetSell account
        let txResult = await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.maxAmountSell, mp.assetIdSell)
        assert(txResult.bSucc, `Call transfer() failed. [MSG = ${txResult.message}]`)

        await cennzx.checkMethod(mp)
    });

    it.skip(`Eve spends 'tokenAsssetId_2' to transfer fixed 'tokenAsssetId_1' to Dave`, async function() {

        const traderSeed            = 'Eve'
        const recipient             = 'Dave'
        const assetIdSold           = tokenAsssetId_2
        const assetIdBought         = tokenAsssetId_1
        const amountBought          = '1000'
        const maxAmountSold         = '20000'

        let txResult = null

        // top up asset account
        txResult = await node.transfer(tokenIssuerSeed, traderSeed, maxAmountSold, assetIdSold)
        assert(txResult.bSucc, `Call transfer() failed. [MSG = ${txResult.message}]`)

        // get reciepent's token balance
        const reciepentTokenBal_beforeTx = await node.queryFreeBalance(recipient, assetIdBought)

        // get all balances before tx
        const assetSoldBal_beforeTx = new cennzx.CennzXBalance(traderSeed, assetIdSold, coreAsssetId)
        const assetBoughtBal_beforeTx = new cennzx.CennzXBalance(traderSeed, assetIdBought, coreAsssetId)
        await assetSoldBal_beforeTx.getAll()
        await assetBoughtBal_beforeTx.getAll()

        // await assetSoldBal_beforeTx.displayInfo()
        // await assetBoughtBal_beforeTx.displayInfo()

        // get estimated price
        const swapPrice = await cennzx.getOutputPrice(assetIdSold, assetIdBought, amountBought)

        const coreToAssetBought_price = await cennzx.getOutputPrice(coreAsssetId, assetIdBought, amountBought)

        // swap core to token
        txResult = await cennzx.assetTransferOutput(traderSeed, recipient, assetIdSold, assetIdBought, amountBought, maxAmountSold)
        assert(txResult.bSucc, `Call assetTransferOutput() failed. [MSG = ${txResult.message}]`)

        // get all balance after tx
        const txFee = txResult.txFee
        // console.log('txFee =', txFee)

        // get reciepent's token balance
        const reciepentTokenBal_afterTx = await node.queryFreeBalance(recipient, assetIdBought)

        // get all balances after tx
        const assetSoldBal_afterTx = new cennzx.CennzXBalance(traderSeed, assetIdSold, coreAsssetId)
        const assetBoughtBal_afterTx = new cennzx.CennzXBalance(traderSeed, assetIdBought, coreAsssetId)
        await assetSoldBal_afterTx.getAll()
        await assetBoughtBal_afterTx.getAll()

        // await assetSoldBal_afterTx.displayInfo()
        // await assetBoughtBal_afterTx.displayInfo()

        // check recipient's assetIdBought balance
        assert.equal( 
            reciepentTokenBal_afterTx,
            BigNumber(reciepentTokenBal_beforeTx).add(amountBought).toString(), 
            `Recipient's core asset balance is wrong. `)

        // check trader's assetSold balance
        assert.equal( 
            assetSoldBal_afterTx.traderTokenAssetBal , 
            BigNumber(assetSoldBal_beforeTx.traderTokenAssetBal).minus(swapPrice).toString(), 
            `Trader's assetSold(${assetIdSold}) balance is wrong.` )
        // check trader's assetBought balance
        assert.equal( 
            assetBoughtBal_afterTx.traderTokenAssetBal, 
            assetBoughtBal_beforeTx.traderTokenAssetBal, 
            `Trader's assetBought(${assetIdBought}) balance is wrong.` )
        // check trader's core asset balance
        assert.equal( 
            assetBoughtBal_afterTx.traderCoreAssetBal,
            BigNumber(assetBoughtBal_beforeTx.traderCoreAssetBal).minus(txFee).toString(), 
            `Trader's core asset(${coreAsssetId}) balance is wrong.`)

        // check core asset balance in assetSold exchange pool
        assert.equal( 
            assetSoldBal_afterTx.poolCoreAsssetBal, 
            BigNumber(assetSoldBal_beforeTx.poolCoreAsssetBal).minus(coreToAssetBought_price).toString(), 
            `Core asset balance is wrong in assetSold(${assetIdSold}) exchange pool.`)
        // check assetSold balance in assetSold exchange pool
        assert.equal( 
            assetSoldBal_afterTx.poolTokenAsssetBal , 
            BigNumber(assetSoldBal_beforeTx.poolTokenAsssetBal).add(swapPrice).toString(), 
            `AssetSold(${assetIdSold}) balance is wrong in its exchange pool.` )

        // check core asset balance in assetBought exchange pool
        assert.equal( 
            assetBoughtBal_afterTx.poolCoreAsssetBal, 
            BigNumber(assetBoughtBal_beforeTx.poolCoreAsssetBal).add(coreToAssetBought_price).toString(), 
            `Exchange core asset balance is wrong.`)
        // check assetBought balance in assetBought exchange pool
        assert.equal( 
            assetBoughtBal_afterTx.poolTokenAsssetBal , 
            BigNumber(assetBoughtBal_beforeTx.poolTokenAsssetBal).minus(amountBought).toString(), 
            `Exchange token asset balance is wrong.` )

        // check total liquidity for assetSold
        assert.equal( assetSoldBal_afterTx.totalLiquidity , assetSoldBal_beforeTx.totalLiquidity, `Total liquidity of assetSold is wrong.` )
        // check trader liquidity for assetSold
        assert.equal( assetSoldBal_afterTx.traderLiquidity , assetSoldBal_beforeTx.traderLiquidity, `Trader's liquidity assetSold is wrong.` )

        // check total liquidity for assetBought
        assert.equal( assetBoughtBal_afterTx.totalLiquidity , assetBoughtBal_beforeTx.totalLiquidity, `Total liquidity of assetBought is wrong.` )
        // check trader liquidity for token_2
        assert.equal( assetBoughtBal_afterTx.traderLiquidity , assetBoughtBal_beforeTx.traderLiquidity, `Trader's liquidity of assetBought is wrong.` )
    });

    it(`TODO: Eve sells fixed 'tokenAsssetId_2' to transfer 'tokenAsssetId_1' to Dave`, async function() {

        const traderSeed            = 'Eve'
        const recipient             = 'Dave'
        const assetIdSold           = tokenAsssetId_2
        const assetIdBought         = tokenAsssetId_1
        const amountBought          = '1000'
        const maxAmountSold         = '20000'

        let txResult = null

        // top up asset account
        txResult = await node.transfer(tokenIssuerSeed, traderSeed, maxAmountSold, assetIdSold)
        assert(txResult.bSucc, `Call transfer() failed. [MSG = ${txResult.message}]`)

        // get reciepent's token balance
        const reciepentTokenBal_beforeTx = await node.queryFreeBalance(recipient, assetIdBought)

        // get all balances before tx
        const assetSoldBal_beforeTx = new cennzx.CennzXBalance(traderSeed, assetIdSold, coreAsssetId)
        const assetBoughtBal_beforeTx = new cennzx.CennzXBalance(traderSeed, assetIdBought, coreAsssetId)
        await assetSoldBal_beforeTx.getAll()
        await assetBoughtBal_beforeTx.getAll()

        // await assetSoldBal_beforeTx.displayInfo()
        // await assetBoughtBal_beforeTx.displayInfo()

        // get estimated price
        const swapPrice = await cennzx.getOutputPrice(assetIdSold, assetIdBought, amountBought)

        const coreToAssetBought_price = await cennzx.getOutputPrice(coreAsssetId, assetIdBought, amountBought)

        // swap core to token
        txResult = await cennzx.assetTransferOutput(traderSeed, recipient, assetIdSold, assetIdBought, amountBought, maxAmountSold)
        assert(txResult.bSucc, `Call assetTransferOutput() failed. [MSG = ${txResult.message}]`)

        // get all balance after tx
        const txFee = txResult.txFee
        // console.log('txFee =', txFee)

        // get reciepent's token balance
        const reciepentTokenBal_afterTx = await node.queryFreeBalance(recipient, assetIdBought)

        // get all balances after tx
        const assetSoldBal_afterTx = new cennzx.CennzXBalance(traderSeed, assetIdSold, coreAsssetId)
        const assetBoughtBal_afterTx = new cennzx.CennzXBalance(traderSeed, assetIdBought, coreAsssetId)
        await assetSoldBal_afterTx.getAll()
        await assetBoughtBal_afterTx.getAll()

        // await assetSoldBal_afterTx.displayInfo()
        // await assetBoughtBal_afterTx.displayInfo()

        // check recipient's assetIdBought balance
        assert.equal( 
            reciepentTokenBal_afterTx,
            BigNumber(reciepentTokenBal_beforeTx).add(amountBought).toString(), 
            `Recipient's core asset balance is wrong. `)

        // check trader's assetSold balance
        assert.equal( 
            assetSoldBal_afterTx.traderTokenAssetBal , 
            BigNumber(assetSoldBal_beforeTx.traderTokenAssetBal).minus(swapPrice).toString(), 
            `Trader's assetSold(${assetIdSold}) balance is wrong.` )
        // check trader's assetBought balance
        assert.equal( 
            assetBoughtBal_afterTx.traderTokenAssetBal, 
            assetBoughtBal_beforeTx.traderTokenAssetBal, 
            `Trader's assetBought(${assetIdBought}) balance is wrong.` )
        // check trader's core asset balance
        assert.equal( 
            assetBoughtBal_afterTx.traderCoreAssetBal,
            BigNumber(assetBoughtBal_beforeTx.traderCoreAssetBal).minus(txFee).toString(), 
            `Trader's core asset(${coreAsssetId}) balance is wrong.`)

        // check core asset balance in assetSold exchange pool
        assert.equal( 
            assetSoldBal_afterTx.poolCoreAsssetBal, 
            BigNumber(assetSoldBal_beforeTx.poolCoreAsssetBal).minus(coreToAssetBought_price).toString(), 
            `Core asset balance is wrong in assetSold(${assetIdSold}) exchange pool.`)
        // check assetSold balance in assetSold exchange pool
        assert.equal( 
            assetSoldBal_afterTx.poolTokenAsssetBal , 
            BigNumber(assetSoldBal_beforeTx.poolTokenAsssetBal).add(swapPrice).toString(), 
            `AssetSold(${assetIdSold}) balance is wrong in its exchange pool.` )

        // check core asset balance in assetBought exchange pool
        assert.equal( 
            assetBoughtBal_afterTx.poolCoreAsssetBal, 
            BigNumber(assetBoughtBal_beforeTx.poolCoreAsssetBal).add(coreToAssetBought_price).toString(), 
            `Exchange core asset balance is wrong.`)
        // check assetBought balance in assetBought exchange pool
        assert.equal( 
            assetBoughtBal_afterTx.poolTokenAsssetBal , 
            BigNumber(assetBoughtBal_beforeTx.poolTokenAsssetBal).minus(amountBought).toString(), 
            `Exchange token asset balance is wrong.` )

        // check total liquidity for assetSold
        assert.equal( assetSoldBal_afterTx.totalLiquidity , assetSoldBal_beforeTx.totalLiquidity, `Total liquidity of assetSold is wrong.` )
        // check trader liquidity for assetSold
        assert.equal( assetSoldBal_afterTx.traderLiquidity , assetSoldBal_beforeTx.traderLiquidity, `Trader's liquidity assetSold is wrong.` )

        // check total liquidity for assetBought
        assert.equal( assetBoughtBal_afterTx.totalLiquidity , assetBoughtBal_beforeTx.totalLiquidity, `Total liquidity of assetBought is wrong.` )
        // check trader liquidity for token_2
        assert.equal( assetBoughtBal_afterTx.traderLiquidity , assetBoughtBal_beforeTx.traderLiquidity, `Trader's liquidity of assetBought is wrong.` )
    });
    
    it.skip('TODO: Pay tx fee with the new-created asset', async function() {
        // create tx

        // add fee option
        tx.addFeeExchangeOpt({
            assetId: 16000,
            maxPayment: 50000,
        });

        // sign and send tx
        
    });

    it('Bob remove liquidity', async function() {
        

        const traderSeed        = 'Bob' // Bob
        const burnedAmount      = 10000
        const minAssetWithdraw  = 1
        const minCoreWithdraw   = 1

        // await displayInfo(traderSeed)

        // get all balances before tx
        const beforeTxBal = await new cennzx.CennzXBalance(traderSeed, tokenAsssetId_1, coreAsssetId)
        await beforeTxBal.getAll()

        // first add the liquidity
        const txResult = await cennzx.removeLiquidity(traderSeed, tokenAsssetId_1, burnedAmount, minAssetWithdraw, minCoreWithdraw)
        assert(txResult.bSucc, `Call removeLiquidity() failed. [MSG = ${txResult.message}]`)

        // get tx fee
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = await new cennzx.CennzXBalance(traderSeed, tokenAsssetId_1, coreAsssetId)
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


