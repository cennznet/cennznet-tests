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
const expect = require('chai').expect
const cennzx = require('../../api/cennzx')
const fee = require('../../api/fee')
const ga = require('../../api/ga')
const node = require('../../api/node')
const BN = require('bignumber.js')
const mlog = require('mocha-logger')
const GA = require('../../api/ga')




/**
 * Formula for token exchange:
 * -- Buy token: [poolCoreBal + coreCost ] * (poolTokenBal - tokenBuy) = poolCoreBal * poolTokenBal
 *       @ Buy fixed amount of token: actualCoreCost = coreCost ( 1 + feeRate )
 *       @ Sell fixed amount of core: actualCoreSell = coreCost / ( 1 + feeRate )
 *            
 * -- Buy core: [poolCoreBal - coreBuy] * (poolTokenBal + tokenCost) = poolCoreBal * poolTokenBal
 *       @ Buy fixed amount of core: actualTokenCost = tokenCost ( 1 + feeRate )
 *       @ Sell fixed amount of token: actualTokenSell = tokenCost / ( 1 + feeRate )
 * 
 * @ Result gets rounded down in Input Tx
 *      eg. 100.7 -> 100
 * @ Result（includes integer) gets rounded up in Output Tx:
 *      eg. 0.12 -> 1,  10 -> 11
 */

var coreAsssetId = -1
var tokenIssuerSeed = 'Eve'
const tokenTotalAmount = BN(3.4e38).toFixed()
const minLiquidityWanted = 1



describe('CennzX test suite for bignumber overflow', function () {

    before( async function(){

        // get core asset id
        coreAsssetId = (await cennzx.getCoreAssetId()).toString()
        mlog.log('Core asset ID =', coreAsssetId)
    })

    it('TODO: bug(price wrong) - assetSwapInput(token -> core): pool_token_amt << pool_core_amt', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(1e10).toFixed()
        const poolCoreBalance   = BN(1e18).toFixed()
        const swapTradeAmount   = BN(1e10).toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = newTokenAsssetId
        mp.assetIdBuy = coreAsssetId
        mp.amountBuy = swapTradeAmount
        mp.maxAmountSell = BN(3.4e38).toFixed()

        let apiPrice = await cennzx.getInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('apiPrice =', apiPrice.toString())

        const formulaPrice = await cennzx.getFormulaInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('fmlPrice =', formulaPrice.toFixed())

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice.toFixed()})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('TODO: bug(Pool balance is low) - assetSwapInput(token -> core): pool_token_amt >> pool_core_amt', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(1e18).toFixed()
        const poolCoreBalance   = BN(1e10).toFixed()
        const swapTradeAmount   = BN(9e20).toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = newTokenAsssetId
        mp.assetIdBuy = coreAsssetId
        mp.amountBuy = swapTradeAmount
        mp.maxAmountSell = BN(3.4e38).toFixed()

        const formulaPrice = await cennzx.getFormulaInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('fmlPrice =', formulaPrice.toFixed())

        let apiPrice = await cennzx.getInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('apiPrice =', apiPrice.toString())

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice.toFixed()})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('TODO: bug(Pool balance is low) - assetSwapInput(core -> token): max pool_token_amt and swap nearly all token', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = tokenTotalAmount
        const poolCoreBalance   = BN(10).toFixed()
        const swapTradeAmount   = BN(9e20).toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = coreAsssetId
        mp.assetIdBuy = newTokenAsssetId
        mp.amountBuy = swapTradeAmount
        mp.maxAmountSell = BN(3.4e38).toFixed()

        const formulaPrice = await cennzx.getFormulaInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('fmlPrice =', formulaPrice.toFixed())

        let apiPrice = await cennzx.getInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('apiPrice =', apiPrice.toString())

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice.toFixed()})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('TODO: bug(price is 0) - assetSwapInput(core -> token): max pool_token_amt and swap nearly all token', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = tokenTotalAmount
        const poolCoreBalance   = BN(10).toFixed()
        const swapTradeAmount   = BN(1).toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = coreAsssetId
        mp.assetIdBuy = newTokenAsssetId
        mp.amountBuy = swapTradeAmount
        mp.maxAmountSell = BN(3.4e38).toFixed()

        const formulaPrice = await cennzx.getFormulaInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('fmlPrice =', formulaPrice.toFixed())

        let apiPrice = await cennzx.getInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('apiPrice =', apiPrice.toString())

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice.toFixed()})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('assetSwapOutput(token -> core): pool_token_amt >> pool_core_amt', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(1e18).toFixed()
        const poolCoreBalance   = BN(1e10).toFixed()
        const swapTradeAmount   = BN(9.999999999e9).toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = newTokenAsssetId
        mp.assetIdBuy = coreAsssetId
        mp.amountBuy = swapTradeAmount
        mp.maxAmountSell = BN(3.4e38).toFixed()

        let apiPrice = await cennzx.getOutputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('apiPrice =', apiPrice.toString())

        const formulaPrice = await cennzx.getFormulaOutputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('fmlPrice =', formulaPrice.toFixed())

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice.toFixed()})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('assetSwapOutput(token -> core): pool_token_amt << pool_core_amt', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(1e10).toFixed()
        const poolCoreBalance   = BN(1e18).toFixed()
        const swapTradeAmount   = BN(9.999999999999999e17).toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = newTokenAsssetId
        mp.assetIdBuy = coreAsssetId
        mp.amountBuy = swapTradeAmount
        mp.maxAmountSell = BN(3.4e38).toFixed()

        const formulaPrice = await cennzx.getFormulaOutputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('fmlPrice =', formulaPrice.toFixed())

        let apiPrice = await cennzx.getOutputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('apiPrice =', apiPrice.toString())

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice.toFixed()})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('assetSwapOutput(core -> token): max pool_token_amt & tiny pool_core_amt and swap nearly all token', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = tokenTotalAmount
        const poolCoreBalance   = BN(10).toFixed()
        const swapTradeAmount   = BN('339999999999999990000000000000000000000').toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = coreAsssetId
        mp.assetIdBuy = newTokenAsssetId
        mp.amountBuy = swapTradeAmount
        mp.maxAmountSell = BN(3.4e38).toFixed()

        let apiPrice = await cennzx.getOutputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('apiPrice =', apiPrice.toString())

        const formulaPrice = await cennzx.getFormulaOutputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('fmlPrice =', formulaPrice.toFixed())

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice.toFixed()})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('assetSwapOutput(core -> token): tiny pool_token_amt & large pool_core_amt', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(10).toFixed()
        const poolCoreBalance   = BN(1e20).toFixed()
        const swapTradeAmount   = BN('1').toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = coreAsssetId
        mp.assetIdBuy = newTokenAsssetId
        mp.amountBuy = swapTradeAmount
        mp.maxAmountSell = BN(3.4e38).toFixed()

        let apiPrice = await cennzx.getOutputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('apiPrice =', apiPrice.toString())

        const formulaPrice = await cennzx.getFormulaOutputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('fmlPrice =', formulaPrice.toFixed())

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice.toFixed()})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('Add liquidity twice', async function () {

        // const tokenAmount = BN(1e25).toFixed()
        // const poolTokenBalance  = BN(1e10).toFixed()
        // const poolCoreBalance   = BN(1e5).toFixed()

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(10).toFixed()
        const poolCoreBalance   = BN(1e20).toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)
        mlog.log('getPoolAssetBalance =', (await cennzx.getPoolAssetBalance(newTokenAsssetId)).toString())
        mlog.log('getPoolCoreAssetBalance =', (await cennzx.getPoolCoreAssetBalance(newTokenAsssetId)).toString())
        mlog.log('token balance =', (await node.queryFreeBalance(tokenIssuerSeed, newTokenAsssetId)).toString())

        mlog.log('------- 2nd -----------')
        const coreAmountInput = BN(1e5).toFixed()
        const liquidityPrice = await cennzx.liquidityPrice(newTokenAsssetId, coreAmountInput)
        mlog.log('liquidityPrice =', liquidityPrice)

        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, liquidityPrice, coreAmountInput)

        mlog.log('getPoolAssetBalance =', (await cennzx.getPoolAssetBalance(newTokenAsssetId)).toString())
        mlog.log('getPoolCoreAssetBalance =', (await cennzx.getPoolCoreAssetBalance(newTokenAsssetId)).toString())
        mlog.log('token balance =', (await node.queryFreeBalance(tokenIssuerSeed, newTokenAsssetId)).toString())
    });


    it.only('Add liquidity twice', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(tokenTotalAmount).div(2).toFixed()
        const poolCoreBalance   = BN(1e20).toFixed()

        mlog.log('------------------')

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        const before_poolAssetBal = await cennzx.getPoolAssetBalance(newTokenAsssetId)
        const before_poolCoreBal = await cennzx.getPoolCoreAssetBalance(newTokenAsssetId)

        mlog.log('before_poolAssetBal =', before_poolAssetBal)
        mlog.log('before_poolCoreBal =', before_poolCoreBal)

        
        const coreAmountInput = BN(1e15).toFixed()
        const apiLiquidityPrice = await cennzx.liquidityPrice(newTokenAsssetId, coreAmountInput)

        mlog.log('add core amount =', coreAmountInput)
        mlog.log('apiLiquidityPrice =', apiLiquidityPrice)

        const formulaLiquidityPrice = BN(before_poolAssetBal).times(coreAmountInput).div(before_poolCoreBal).dp(0).plus(1)
        mlog.log('formulaLiquidityPrice =', formulaLiquidityPrice.toFixed())

        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, apiLiquidityPrice, coreAmountInput)

        const after_poolAssetBal = await cennzx.getPoolAssetBalance(newTokenAsssetId)
        const after_poolCoreBal = await cennzx.getPoolCoreAssetBalance(newTokenAsssetId)

        mlog.log('after_poolAssetBal =', after_poolAssetBal)
        mlog.log('after_poolCoreBal =', after_poolCoreBal)

        assert(BN(formulaLiquidityPrice).minus(apiLiquidityPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiLiquidityPrice.toString()}) != formulaPrice(${formulaLiquidityPrice.toFixed()})`)

        assert.equal(
            after_poolAssetBal.toString(), 
            BN(before_poolAssetBal).plus(apiLiquidityPrice).toFixed(),
            'Pool asset balance is wrong.')
        
        assert.equal(
            after_poolCoreBal.toString(),
            BN(before_poolCoreBal).plus(coreAmountInput).toFixed(),
            'Pool core balance is wrong.')
    });

    it('TODO: write new case - Remove liquidity', async function () {

        const traderSeed = 'Bob' // Bob
        const burnedAmount = '10000'
        const minAssetWithdraw = 1
        const minCoreWithdraw = 1

        // await displayInfo(traderSeed)

        // get all balances before tx
        const beforeTxBal = await new cennzx.LiquidityBalance(traderSeed, tokenAsssetId_1, coreAsssetId)
        await beforeTxBal.getAll()

        // first add the liquidity
        const txResult = await cennzx.removeLiquidity(traderSeed, tokenAsssetId_1, burnedAmount, minAssetWithdraw, minCoreWithdraw)
        assert(txResult.bSucc, `Call removeLiquidity() failed. [MSG = ${txResult.message}]`)

        // get tx fee
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = await new cennzx.LiquidityBalance(traderSeed, tokenAsssetId_1, coreAsssetId)
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
            afterTxBal.traderLiquidity,
            BN(beforeTxBal.traderLiquidity).minus(burnedAmount).toFixed(),
            `Trader's liquidity balance is wrong.`)

        // check total liquidity
        assert.equal(
            afterTxBal.totalLiquidity,
            BN(beforeTxBal.totalLiquidity).minus(burnedAmount).toFixed(),
            `Total liquidity balance is wrong.`)

        // check pool's core balance
        assert.equal(
            afterTxBal.poolCoreAsssetBal,
            BN(beforeTxBal.poolCoreAsssetBal).minus(withdrawalCoreAmt).toFixed(),
            `Pool's core balance is wrong.`)

        // check pool's token balance
        assert.equal(
            afterTxBal.poolTokenAsssetBal,
            BN(beforeTxBal.poolTokenAsssetBal).minus(withdrawalTokenAmt).toFixed(),
            `Pool's token balance is wrong.`)

        // check trader's core balance
        assert.equal(
            afterTxBal.traderCoreAssetBal,
            BN(beforeTxBal.traderCoreAssetBal).plus(withdrawalCoreAmt).minus(txFee).toFixed(),
            `Trader's core balance is wrong.`)

        // check trader's token balance
        assert.equal(
            afterTxBal.traderTokenAssetBal,
            BN(beforeTxBal.traderTokenAssetBal).plus(withdrawalTokenAmt).toFixed(),
            `Trader's token balance is wrong.`)
    });

});


