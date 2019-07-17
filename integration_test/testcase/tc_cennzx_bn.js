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

    it('TODO: retest bug(price wrong) - assetSwapInput(token -> core): pool_token_amt << pool_core_amt', async function () {

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

    it('TODO: retest bug(Pool balance is low) - assetSwapInput(token -> core): pool_token_amt >> pool_core_amt', async function () {

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

    it('TODO: retest bug(Pool balance is low) - assetSwapInput(core -> token): max pool_token_amt and swap nearly all token', async function () {

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

    it('TODO: retest bug(price is 0) - assetSwapInput(core -> token): max pool_token_amt and swap nearly all token', async function () {

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

    it('TODO: retest bug(add liquidity is wrong) - Add liquidity twice', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(tokenTotalAmount).div(2).toFixed()
        const poolCoreBalance   = BN(1e20).toFixed()

        mlog.log('------------------')

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        const beforeTx_poolAssetBal = await cennzx.getPoolAssetBalance(newTokenAsssetId)
        const beforeTx_poolCoreBal = await cennzx.getPoolCoreAssetBalance(newTokenAsssetId)

        mlog.log('beforeTx_poolAssetBal =', beforeTx_poolAssetBal)
        mlog.log('beforeTx_poolCoreBal =', beforeTx_poolCoreBal)

        
        const coreAmountInput = BN(1e15).toFixed()
        const apiLiquidityPrice = await cennzx.getAddLiquidityPrice(newTokenAsssetId, coreAmountInput)

        mlog.log('add core amount =', coreAmountInput)
        mlog.log('apiLiquidityPrice =', apiLiquidityPrice)

        const formulaLiquidityPrice = BN(beforeTx_poolAssetBal).times(coreAmountInput).div(beforeTx_poolCoreBal).dp(0).plus(1)
        mlog.log('formulaLiquidityPrice =', formulaLiquidityPrice.toFixed())

        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, apiLiquidityPrice, coreAmountInput)

        const afterTx_poolAssetBal = await cennzx.getPoolAssetBalance(newTokenAsssetId)
        const afterTx_poolCoreBal = await cennzx.getPoolCoreAssetBalance(newTokenAsssetId)

        mlog.log('afterTx_poolAssetBal =', afterTx_poolAssetBal)
        mlog.log('afterTx_poolCoreBal =', afterTx_poolCoreBal)

        assert(BN(formulaLiquidityPrice).minus(apiLiquidityPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiLiquidityPrice.toString()}) != formulaPrice(${formulaLiquidityPrice.toFixed()})`)

        assert.equal(
            afterTx_poolAssetBal.toString(), 
            BN(beforeTx_poolAssetBal).plus(apiLiquidityPrice).toFixed(),
            'Pool asset balance is wrong.')
        
        assert.equal(
            afterTx_poolCoreBal.toString(),
            BN(beforeTx_poolCoreBal).plus(coreAmountInput).toFixed(),
            'Pool core balance is wrong.')
    });

    it('TODO: retest bug(Pool asset balance is wrong.) - Second trader add liquidity', async function () {

        let txResult = null

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(tokenTotalAmount).div(2).toFixed()
        const poolCoreBalance   = BN(1e20).toFixed()
        const secondTrader = 'Alice'
        const coreAmountInput = BN(1e18).toFixed()

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        const beforeTxInfo = new cennzx.LiquidityBalance(tokenIssuerSeed, newTokenAsssetId)
        await beforeTxInfo.getAll()
        await beforeTxInfo.displayInfo()

        const apiLiquidityPrice = await cennzx.getAddLiquidityPrice(newTokenAsssetId, coreAmountInput)

        mlog.log('add core amount =', coreAmountInput)
        mlog.log('apiLiquidityPrice =', apiLiquidityPrice)

        const formulaLiquidityPrice = BN(beforeTxInfo.poolTokenAsssetBal).times(coreAmountInput).div(beforeTxInfo.poolCoreAsssetBal).dp(0).plus(1)
        mlog.log('formulaLiquidityPrice =', formulaLiquidityPrice.toFixed())

        txResult = await node.transfer(tokenIssuerSeed, secondTrader, BN(tokenTotalAmount).div(2).toFixed(), newTokenAsssetId)
        assert.equal(txResult.bSucc, true, 'transfer() is wrong.')

        txResult = await cennzx.addLiquidity(secondTrader, newTokenAsssetId, minLiquidityWanted, apiLiquidityPrice, coreAmountInput)
        assert.equal(txResult.bSucc, true, 'addLiquidity() is wrong.')

        const afterTxInfo_issuer = new cennzx.LiquidityBalance(tokenIssuerSeed, newTokenAsssetId)
        await afterTxInfo_issuer.getAll()
        await afterTxInfo_issuer.displayInfo()
        
        const afterTxInfo_trader2 = new cennzx.LiquidityBalance(secondTrader, newTokenAsssetId)
        await afterTxInfo_trader2.getAll()
        await afterTxInfo_trader2.displayInfo()

        assert(BN(formulaLiquidityPrice).minus(apiLiquidityPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiLiquidityPrice.toString()}) != formulaPrice(${formulaLiquidityPrice.toFixed()})`)

        assert.equal(
            afterTxInfo_issuer.poolTokenAsssetBal.toString(), 
            BN(beforeTxInfo.poolTokenAsssetBal).plus(apiLiquidityPrice).toFixed(),
            'Pool asset balance is wrong.')
        
        assert.equal(
            afterTxInfo_issuer.poolCoreAsssetBal.toString(),
            BN(beforeTxInfo.poolCoreAsssetBal).plus(coreAmountInput).toFixed(),
            'Pool core balance is wrong.')

        assert.equal(
            afterTxInfo_issuer.totalLiquidity.toString(),
            BN(beforeTxInfo.totalLiquidity).plus(coreAmountInput).toFixed(),
            'Pool core balance is wrong.')
    });

    it('TODO: retest bug(Pool core asset balance is wrong) - Remove half liquidity', async function () {

        const poolTokenBalance  = tokenTotalAmount
        const poolCoreBalance   = BN(1e20).toFixed()
        const burnedAmount = BN(poolCoreBalance).div(2).toFixed()

        await checkRemoveLiquidity(poolTokenBalance, poolCoreBalance, burnedAmount)
    });

    it('Remove all liquidity', async function () {

        const poolTokenBalance  = BN(1e10).toFixed()
        const poolCoreBalance   = BN(2e10).toFixed()
        const burnedAmount = BN(poolCoreBalance).toFixed()

        await checkRemoveLiquidity(poolTokenBalance, poolCoreBalance, burnedAmount)
    });

    it('TODO: run test after remove liquidity bug fixed - Remove half liquidity of second trader', async function () {

        let txResult = null

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(tokenTotalAmount).div(2).toFixed()
        const poolCoreBalance   = BN(1e20).toFixed()
        const secondTrader = 'Alice'
        const coreAmountInput = BN(1e18).toFixed()
        const burnedAmount = BN(coreAmountInput).div(2).toFixed()

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        txResult = await node.transfer(tokenIssuerSeed, secondTrader, BN(tokenTotalAmount).div(2).toFixed(), newTokenAsssetId)
        assert.equal(txResult.bSucc, true, 'transfer() is wrong.')

        const addLiquidityPrice = await cennzx.getAddLiquidityPrice(newTokenAsssetId, coreAmountInput)

        txResult = await cennzx.addLiquidity(secondTrader, newTokenAsssetId, minLiquidityWanted, addLiquidityPrice, coreAmountInput)
        assert.equal(txResult.bSucc, true, 'addLiquidity() is wrong.')

        mlog.log('before tx -------->')
        const beforeTxInfo_issuer = new cennzx.LiquidityBalance(tokenIssuerSeed, newTokenAsssetId)
        await beforeTxInfo_issuer.getAll()
        await beforeTxInfo_issuer.displayInfo()
        
        const beforeTxInfo_trader = new cennzx.LiquidityBalance(secondTrader, newTokenAsssetId)
        await beforeTxInfo_trader.getAll()
        await beforeTxInfo_trader.displayInfo()

        const removePrice = await cennzx.getRemoveLiquidityPrice(secondTrader, newTokenAsssetId, burnedAmount)
        mlog.log('burnedAmount =', burnedAmount)
        mlog.log('removePrice =', JSON.stringify(removePrice))

        txResult = await cennzx.removeLiquidity(secondTrader, newTokenAsssetId, burnedAmount, 1, 1)
        assert.equal(txResult.bSucc, true, 'removeLiquidity() is wrong.')
        const txFee = txResult.txFee

        mlog.log('after tx -------->')

        const afterInfo_issuer = new cennzx.LiquidityBalance(tokenIssuerSeed, newTokenAsssetId)
        await afterInfo_issuer.getAll()
        await afterInfo_issuer.displayInfo()
        
        const afterInfo_trader = new cennzx.LiquidityBalance(secondTrader, newTokenAsssetId)
        await afterInfo_trader.getAll()
        await afterInfo_trader.displayInfo()

        // check pool token
        assert.equal(
            afterInfo_issuer.poolTokenAsssetBal.toString(), 
            BN(beforeTxInfo_issuer.poolTokenAsssetBal).minus(removePrice.tokenAmount).toFixed(),
            'Pool asset balance is wrong.')
        // check pool core
        assert.equal(
            afterInfo_issuer.poolCoreAsssetBal.toString(),
            BN(beforeTxInfo_issuer.poolCoreAsssetBal).minus(removePrice.coreAmount).toFixed(),
            'Pool core balance is wrong.')
        // check trader liquidity
        assert.equal(
            afterInfo_trader.traderLiquidity.toString(),
            BN(beforeTxInfo_trader.traderLiquidity).minus(burnedAmount).toFixed(),
            'Trader liquidity is wrong.')
        // check issuer liquidity
        assert.equal(
            afterInfo_issuer.traderLiquidity,
            beforeTxInfo_issuer.traderLiquidity,
            'Issuer liquidity is wrong.')
        // check trader token balance
        assert.equal(
            afterInfo_trader.traderTokenAssetBal.toString(),
            BN(beforeTxInfo_trader.traderTokenAssetBal).plus(removePrice.tokenAmount).toFixed(),
            'Trader token balance is wrong.')
        // check trader core balance
        assert.equal(
            afterInfo_trader.traderCoreAssetBal.toString(),
            BN(beforeTxInfo_trader.traderCoreAssetBal).plus(removePrice.coreAmount).minus(txFee).toFixed(),
            'Trader core balance is wrong.')
    });

    it('TODO: run test after remove liquidity bug fixed - Remove all liquidity of second trader', async function () {

        let txResult = null

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(tokenTotalAmount).div(2).toFixed()
        const poolCoreBalance   = BN(1e20).toFixed()
        const secondTrader = 'Alice'
        const coreAmountInput = BN(1e18).toFixed()
        const burnedAmount = coreAmountInput

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        txResult = await node.transfer(tokenIssuerSeed, secondTrader, BN(tokenTotalAmount).div(2).toFixed(), newTokenAsssetId)
        assert.equal(txResult.bSucc, true, 'transfer() is wrong.')

        const addLiquidityPrice = await cennzx.getAddLiquidityPrice(newTokenAsssetId, coreAmountInput)

        txResult = await cennzx.addLiquidity(secondTrader, newTokenAsssetId, minLiquidityWanted, addLiquidityPrice, coreAmountInput)
        assert.equal(txResult.bSucc, true, 'addLiquidity() is wrong.')

        mlog.log('before tx -------->')
        const beforeTxInfo_issuer = new cennzx.LiquidityBalance(tokenIssuerSeed, newTokenAsssetId)
        await beforeTxInfo_issuer.getAll()
        await beforeTxInfo_issuer.displayInfo()
        
        const beforeTxInfo_trader = new cennzx.LiquidityBalance(secondTrader, newTokenAsssetId)
        await beforeTxInfo_trader.getAll()
        await beforeTxInfo_trader.displayInfo()

        const removePrice = await cennzx.getRemoveLiquidityPrice(secondTrader, newTokenAsssetId, burnedAmount)
        mlog.log('burnedAmount =', burnedAmount)
        mlog.log('removePrice =', JSON.stringify(removePrice))

        txResult = await cennzx.removeLiquidity(secondTrader, newTokenAsssetId, burnedAmount, 1, 1)
        assert.equal(txResult.bSucc, true, 'removeLiquidity() is wrong.')
        const txFee = txResult.txFee

        mlog.log('after tx -------->')

        const afterInfo_issuer = new cennzx.LiquidityBalance(tokenIssuerSeed, newTokenAsssetId)
        await afterInfo_issuer.getAll()
        await afterInfo_issuer.displayInfo()
        
        const afterInfo_trader = new cennzx.LiquidityBalance(secondTrader, newTokenAsssetId)
        await afterInfo_trader.getAll()
        await afterInfo_trader.displayInfo()

        // check pool token
        assert.equal(
            afterInfo_issuer.poolTokenAsssetBal.toString(), 
            BN(beforeTxInfo_issuer.poolTokenAsssetBal).minus(removePrice.tokenAmount).toFixed(),
            'Pool asset balance is wrong.')
        // check pool core
        assert.equal(
            afterInfo_issuer.poolCoreAsssetBal.toString(),
            BN(beforeTxInfo_issuer.poolCoreAsssetBal).minus(removePrice.coreAmount).toFixed(),
            'Pool core balance is wrong.')
        // check trader liquidity
        assert.equal(
            afterInfo_trader.traderLiquidity.toString(),
            BN(beforeTxInfo_trader.traderLiquidity).minus(burnedAmount).toFixed(),
            'Trader liquidity is wrong.')
        // check issuer liquidity
        assert.equal(
            afterInfo_issuer.traderLiquidity,
            beforeTxInfo_issuer.traderLiquidity,
            'Issuer liquidity is wrong.')
        // check trader token balance
        assert.equal(
            afterInfo_trader.traderTokenAssetBal.toString(),
            BN(beforeTxInfo_trader.traderTokenAssetBal).plus(removePrice.tokenAmount).toFixed(),
            'Trader token balance is wrong.')
        // check trader core balance
        assert.equal(
            afterInfo_trader.traderCoreAssetBal.toString(),
            BN(beforeTxInfo_trader.traderCoreAssetBal).plus(removePrice.coreAmount).minus(txFee).toFixed(),
            'Trader core balance is wrong.')
    });

    it(`TODO: create - Remove 2nd trader's all liquidity`, async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(1e10).toFixed()
        const poolCoreBalance   = BN(2e20).toFixed()
        const burnedAmount = BN(poolTokenBalance).div(2).toFixed()

        mlog.log('------------------')

        // create new token and exchange pool
        const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
        await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

        const beforeTx_coreBalance = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
        const beforeTx_assetBalance = await node.queryFreeBalance(tokenIssuerSeed, newTokenAsssetId)
        const beforeTx_poolAssetBal = await cennzx.getPoolAssetBalance(newTokenAsssetId)
        const beforeTx_poolCoreBal = await cennzx.getPoolCoreAssetBalance(newTokenAsssetId)

        mlog.log('beforeTx_poolAssetBal =', beforeTx_poolAssetBal)
        mlog.log('beforeTx_poolCoreBal =', beforeTx_poolCoreBal)
        mlog.log('beforeTx_coreBalance =', beforeTx_coreBalance)
        mlog.log('beforeTx_assetBalance =', beforeTx_assetBalance)

        const txResult = await cennzx.removeLiquidity(tokenIssuerSeed, newTokenAsssetId, burnedAmount, 1, 1)
        // get tx fee
        const txFee = txResult.txFee

        const afterTx_coreBalance = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
        const afterTx_assetBalance = await node.queryFreeBalance(tokenIssuerSeed, newTokenAsssetId)
        const afterTx_poolAssetBal = await cennzx.getPoolAssetBalance(newTokenAsssetId)
        const afterTx_poolCoreBal = await cennzx.getPoolCoreAssetBalance(newTokenAsssetId)

        mlog.log('txFee =', txFee)
        mlog.log('afterTx_poolAssetBal =', afterTx_poolAssetBal)
        mlog.log('afterTx_poolCoreBal =', afterTx_poolCoreBal)
        mlog.log('afterTx_coreBalance =', afterTx_coreBalance)
        mlog.log('afterTx_assetBalance =', afterTx_assetBalance)

        assert.equal(
            afterTx_coreBalance,
            BN(beforeTx_coreBalance).plus(poolCoreBalance).minus(txFee).toFixed(),
            'Trader core asset balance is wrong.'
        )
        
        assert.equal(
            afterTx_assetBalance, 
            BN(beforeTx_assetBalance).plus(poolTokenBalance).toFixed(),
            'Trader token asset balance is wrong.')
        
        assert.equal(
            afterTx_poolCoreBal, '0', 'Pool core asset balance is wrong.')

        assert.equal(
            afterTx_assetBalance, '0', 'Pool token asset balance is wrong.')
    });

    it.only(`TODO: create - Add multiply traders' liquidity, then remove them`, async function () {

        const currentTokenTotalAmount = tokenTotalAmount
        const traderCount = 3
        const traderList = []

        function TraderInfo(){
            this.seed           = ''
            this.tokenAmount    = 0

        }

        // generate trader seed
        for (let index = 0; index < traderCount; index++) {
            let trader = new TraderInfo()
            trader.seed = 'trader_' + (1000000 + index).toString()
            traderList.push(trader)
        }

        // console.log(traderList);
        

        // topup all traders with core asset (if balance < 1e18)

        // determine the token amount rate of all traders

        // add liquidity and check

        // remove liquidity and check
    });

});

async function checkRemoveLiquidity(poolTokenBalance, poolCoreBalance, burnedAmount) {

    const tokenAmount = tokenTotalAmount

    // create new token and exchange pool
    const newTokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenAmount)).assetId.toString()
    await cennzx.addLiquidity(tokenIssuerSeed, newTokenAsssetId, minLiquidityWanted, poolTokenBalance, poolCoreBalance)

    const beforeTx_coreBalance = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
    const beforeTx_assetBalance = await node.queryFreeBalance(tokenIssuerSeed, newTokenAsssetId)
    const beforeTx_poolAssetBal = await cennzx.getPoolAssetBalance(newTokenAsssetId)
    const beforeTx_poolCoreBal = await cennzx.getPoolCoreAssetBalance(newTokenAsssetId)

    const removePrice = await cennzx.getRemoveLiquidityPrice(tokenIssuerSeed, newTokenAsssetId, burnedAmount)

    mlog.log('beforeTx_poolAssetBal =', beforeTx_poolAssetBal)
    mlog.log('beforeTx_poolCoreBal =', beforeTx_poolCoreBal)
    mlog.log('beforeTx_coreBalance =', beforeTx_coreBalance)
    mlog.log('beforeTx_assetBalance =', beforeTx_assetBalance)
    mlog.log('burnedAmount =', burnedAmount)
    mlog.log('removeCoreAmount =', removePrice.coreAmount)
    mlog.log('removeTokenAmount =', removePrice.tokenAmount)

    const txResult = await cennzx.removeLiquidity(tokenIssuerSeed, newTokenAsssetId, burnedAmount, 1, 1)
    assert.equal(txResult.bSucc, true, 'Transaction failed')
    mlog.log('removeLiquidity result =', txResult.bSucc)

    // get tx fee
    const txFee = txResult.txFee

    const afterTx_coreBalance = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
    const afterTx_assetBalance = await node.queryFreeBalance(tokenIssuerSeed, newTokenAsssetId)
    const afterTx_poolAssetBal = await cennzx.getPoolAssetBalance(newTokenAsssetId)
    const afterTx_poolCoreBal = await cennzx.getPoolCoreAssetBalance(newTokenAsssetId)

    mlog.log('txFee =', txFee)
    mlog.log('afterTx_poolAssetBal =', afterTx_poolAssetBal)
    mlog.log('afterTx_poolCoreBal =', afterTx_poolCoreBal)
    mlog.log('afterTx_coreBalance =', afterTx_coreBalance)
    mlog.log('afterTx_assetBalance =', afterTx_assetBalance)

    assert.equal(
        afterTx_poolCoreBal, 
        BN(beforeTx_poolCoreBal).minus(removePrice.coreAmount).toFixed(), 
        'Pool core asset balance is wrong.')

    assert.equal(
        afterTx_poolAssetBal, 
        BN(beforeTx_poolAssetBal).minus(removePrice.tokenAmount).toFixed(), 
        'Pool token asset balance is wrong.')

    assert.equal(
        afterTx_coreBalance,
        BN(beforeTx_coreBalance).plus(removePrice.coreAmount).minus(txFee).toFixed(),
        'Trader core asset balance is wrong.'
    )

    assert.equal(
        afterTx_assetBalance,
        BN(beforeTx_assetBalance).plus(removePrice.tokenAmount).toFixed(),
        'Trader token asset balance is wrong.')
}
