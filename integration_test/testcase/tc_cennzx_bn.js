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
const block = require('../../api/block')
const fee = require('../../api/fee')
const ga = require('../../api/ga')
const node = require('../../api/node')
const BN = require('bignumber.js')
const mlog = require('mocha-logger')
const GA = require('../../api/ga')
const util = require('../../api/util')



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
const maxAmount = BN(3.4e38).toFixed()


describe('CennzX test suite for bignumber overflow', function () {

    before( async function(){

        // get core asset id
        coreAsssetId = (await cennzx.getCoreAssetId()).toString()
        mlog.log('Core asset ID =', coreAsssetId)
    })

    it('assetSwapInput(token -> core): pool_token_amt << pool_core_amt', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(1e10).toFixed()
        const poolCoreBalance   = BN(1e18).toFixed()
        const swapTradeAmount   = BN(1e10).toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenAmount, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapInput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = newTokenAsssetId
        mp.assetIdBuy = coreAsssetId
        mp.amountSell = swapTradeAmount
        mp.minAmountBuy = 1

        let apiPrice = await cennzx.getInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountSell)
        mlog.log('apiPrice =', apiPrice.toString())

        const formulaPrice = await cennzx.getFormulaInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountSell)
        mlog.log('fmlPrice =', formulaPrice)

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('assetSwapInput(token -> core): pool_token_amt >> pool_core_amt', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(1e18).toFixed()
        const poolCoreBalance   = BN(1e10).toFixed()
        const swapTradeAmount   = BN(9e20).toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenAmount, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapInput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = newTokenAsssetId
        mp.assetIdBuy = coreAsssetId
        mp.amountSell = swapTradeAmount
        mp.minAmountBuy = 1

        const formulaPrice = await cennzx.getFormulaInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountSell)
        mlog.log('fmlPrice =', formulaPrice)

        let apiPrice = await cennzx.getInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountSell)
        mlog.log('apiPrice =', apiPrice.toString())

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('assetSwapInput(core -> token): max pool_token_amt and swap nearly all token', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = tokenTotalAmount
        const poolCoreBalance   = BN(10).toFixed()
        const swapTradeAmount   = BN(9e20).toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenAmount, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapInput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = coreAsssetId
        mp.assetIdBuy = newTokenAsssetId
        mp.amountSell = swapTradeAmount
        mp.minAmountBuy = 1

        const formulaPrice = await cennzx.getFormulaInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountSell)
        mlog.log('fmlPrice =', formulaPrice)

        let apiPrice = await cennzx.getInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountSell)
        mlog.log('apiPrice =', apiPrice.toString())

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('assetSwapInput(core -> token): max pool_token_amt and swap nearly all token', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = tokenTotalAmount
        const poolCoreBalance   = BN(10).toFixed()
        const swapTradeAmount   = BN(1).toFixed()

        mlog.log('------------------')
        mlog.log('poolTokenBalance =', poolTokenBalance)
        mlog.log('poolCoreBalance =', poolCoreBalance)
        mlog.log('swapTradeAmount =', swapTradeAmount)

        // create new token and exchange pool
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenAmount, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapInput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = coreAsssetId
        mp.assetIdBuy = newTokenAsssetId
        mp.amountSell = swapTradeAmount
        mp.minAmountBuy = 1

        const formulaPrice = await cennzx.getFormulaInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountSell)
        mlog.log('fmlPrice =', formulaPrice)

        let apiPrice = await cennzx.getInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountSell)
        mlog.log('apiPrice =', apiPrice)

        // check price
        assert.equal(apiPrice, formulaPrice, `Input price is wrong.`)
        // assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
        //     `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice})`)

        // do swap and check
        if ( apiPrice > 0 ){
            await cennzx.checkMethod(mp)
        }
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
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenAmount, poolTokenBalance, poolCoreBalance)

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
        mlog.log('fmlPrice =', formulaPrice)

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice})`)

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
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenAmount, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = tokenIssuerSeed
        mp.assetIdSell = newTokenAsssetId
        mp.assetIdBuy = coreAsssetId
        mp.amountBuy = swapTradeAmount
        mp.maxAmountSell = BN(3.4e38).toFixed()

        const formulaPrice = await cennzx.getFormulaOutputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('fmlPrice =', formulaPrice)

        let apiPrice = await cennzx.getOutputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountBuy)
        mlog.log('apiPrice =', apiPrice.toString())

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice})`)

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
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenAmount, poolTokenBalance, poolCoreBalance)

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
        mlog.log('fmlPrice =', formulaPrice)

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice})`)

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
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenAmount, poolTokenBalance, poolCoreBalance)

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
        mlog.log('fmlPrice =', formulaPrice)

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice})`)

        // do swap and check
        await cennzx.checkMethod(mp)
    });

    it('Add liquidity twice', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(tokenAmount).div(2).toFixed()
        const poolCoreBalance   = BN(1e20).toFixed()

        // create new token and exchange pool
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenAmount, poolTokenBalance, poolCoreBalance)

        const coreAmountInput = BN(1e15).toFixed()
        // const apiLiquidityPrice = await cennzx.getAddLiquidityPrice(newTokenAsssetId, coreAmountInput)

        await cennzx.addLiquidityAndCheck(tokenIssuerSeed, newTokenAsssetId, null, coreAmountInput)
    });

    it('Second trader add liquidity', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = BN(tokenTotalAmount).div(2).toFixed()
        const poolCoreBalance   = BN(1e20).toFixed()
        const secondTrader = 'Alice'
        const coreAmountInput = BN(1e18).toFixed()

        // create new token and exchange pool
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenAmount, poolTokenBalance, poolCoreBalance)

        const txResult = await node.transfer(tokenIssuerSeed, secondTrader, BN(tokenTotalAmount).div(2).toFixed(), newTokenAsssetId)
        assert.equal(txResult.bSucc, true, 'transfer() is wrong.')

        await cennzx.addLiquidityAndCheck(secondTrader, newTokenAsssetId, null, coreAmountInput)
    });

    it('Remove half liquidity', async function () {

        const poolTokenBalance  = tokenTotalAmount
        const poolCoreBalance   = BN(1e20).toFixed()
        const burnedAmount = BN(poolCoreBalance).div(2).toFixed()

        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenTotalAmount, poolTokenBalance, poolCoreBalance)
        await cennzx.removeLiquidityAndCheck(tokenIssuerSeed, newTokenAsssetId, burnedAmount)
    });

    it('Remove all liquidity', async function () {

        const poolTokenBalance  = tokenTotalAmount
        const poolCoreBalance   = BN(1e20).toFixed()
        const burnedAmount = poolCoreBalance

        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenTotalAmount, poolTokenBalance, poolCoreBalance)
        await cennzx.removeLiquidityAndCheck(tokenIssuerSeed, newTokenAsssetId, burnedAmount)
    });

    it('Remove half liquidity of second trader', async function () {

        let txResult = null

        const poolTokenBalance  = BN(tokenTotalAmount).div(2).toFixed()
        const poolCoreBalance   = BN(1e20).toFixed()
        const secondTrader = 'Alice'
        const coreAmountInput = BN(1e18).toFixed()
        const burnedAmount = BN(coreAmountInput).div(2).toFixed()

        // create new token and exchange pool
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenTotalAmount, poolTokenBalance, poolCoreBalance)

        txResult = await node.transfer(tokenIssuerSeed, secondTrader, BN(tokenTotalAmount).div(2).toFixed(), newTokenAsssetId)
        assert.equal(txResult.bSucc, true, 'transfer() is wrong.')

        const addLiquidityPrice = await cennzx.getAddLiquidityPrice(newTokenAsssetId, coreAmountInput)

        await cennzx.addLiquidityAndCheck(secondTrader, newTokenAsssetId, addLiquidityPrice, coreAmountInput)
        
        await cennzx.removeLiquidityAndCheck(secondTrader, newTokenAsssetId, burnedAmount)
    });

    it('Remove all liquidity of second trader', async function () {

        let txResult = null

        const poolTokenBalance  = BN(tokenTotalAmount).div(2).toFixed()
        const poolCoreBalance   = BN(1e20).toFixed()
        const secondTrader = 'Alice'
        const coreAmountInput = BN(1e18).toFixed()
        const burnedAmount = coreAmountInput

        // create new token and exchange pool
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenTotalAmount, poolTokenBalance, poolCoreBalance)

        txResult = await node.transfer(tokenIssuerSeed, secondTrader, BN(tokenTotalAmount).div(2).toFixed(), newTokenAsssetId)
        assert.equal(txResult.bSucc, true, 'transfer() is wrong.')

        const addLiquidityPrice = await cennzx.getAddLiquidityPrice(newTokenAsssetId, coreAmountInput)

        await cennzx.addLiquidityAndCheck(secondTrader, newTokenAsssetId, addLiquidityPrice, coreAmountInput)
        
        await cennzx.removeLiquidityAndCheck(secondTrader, newTokenAsssetId, burnedAmount)
    });

    it.skip(`Multiply traders add liquidity, then remove them`, async function () {
        this.timeout(86400000)

        const currentTokenTotalAmount = tokenTotalAmount
        // const currentTokenTotalAmount = BN(1e10).toFixed()
        const traderCount = 200
        const traderList = []
        let totalNumber = 0.0
        const issuerSeed = 'Dave'
        const topup_coreAmt = BN(1e18).toFixed()

        function TraderInfo(){
            this.seed           = ''
            this.randomNumber   = 0
            this.tokenAmount    = 0
            this.coreAmount     = 0
        }

        // generate traders
        for (let index = 0; index < traderCount; index++) {
            let trader = new TraderInfo()
            trader.seed = 'trader_' + (1000000 + index).toString()
            trader.randomNumber = Math.floor((Math.random() * 10000)) // get a number less than 10000
            totalNumber += trader.randomNumber
            traderList.push(trader)
        }

        // get token amount for all traders according to the percentage
        for (let index = 0; index < traderList.length; index++) {
            let trader = traderList[index]
            // get amount according to the percentage
            trader.tokenAmount = BN(trader.randomNumber).times(currentTokenTotalAmount).div(totalNumber).dp(0,1).toFixed()
        }

        // create token
        const newTokenAsssetId = (await ga.createNewToken(issuerSeed, currentTokenTotalAmount)).assetId.toString()

        // topup all traders with core asset (if balance < 1e16) and token asset
        let nonce = await node.getNonce(issuerSeed)
        let txCount = 0
        for (let index = 0; index < traderList.length; index++) {
            const trader = traderList[index]
            trader.coreAmount = await node.queryFreeBalance(trader.seed, coreAsssetId)
            // topup core
            if ( BN(1e18).gt(trader.coreAmount) ){
                node.transferWithNonce(issuerSeed, trader.seed, topup_coreAmt, nonce++, coreAsssetId)
                txCount++
            }
            // topup token
            node.transferWithNonce(issuerSeed, trader.seed, trader.tokenAmount, nonce++, newTokenAsssetId)
            txCount++

            // submit 100 tx
            if (txCount > 100){
                txCount = 0
                await block.waitBlockCnt(1)
            }
        }

        // await all balance change
        mlog.log('Await topup finish...');
        let lastTraderBalance = 0
        let i = 0
        for (i = 0; i < 300; i++){
            await util.sleep(1000)
            lastTraderBalance = await node.queryFreeBalance( traderList[traderList.length - 1].seed, newTokenAsssetId)
            if (BN(lastTraderBalance).gt(0)){
                break
            }
        }

        if ( i >= 300 ){
            throw new Error('Topup token timeout.')
        }

        // await block.waitBlockCnt(1)

        console.log('traderList =', traderList)

        // add liquidity and check
        for (let index = 0; index < traderList.length; index++) {
            let trader = traderList[index]
            let inputTokenAmount = 0
            let inputCoreAmount = 0

            if (index == 0){    // for create pool
                mlog.log(`------ Creat pool (${trader.seed})`)
                inputTokenAmount = trader.tokenAmount
                inputCoreAmount = BN(1e10).toFixed()
            }
            else{   // for adding new liquidity
                mlog.log(`------ add new liquidity (${trader.seed})`)
                // use all token 
                inputCoreAmount = await cennzx.getAddLiquidityPrice_formula(newTokenAsssetId, BN(trader.tokenAmount).minus(1).toFixed(), false)
            }

            await cennzx.addLiquidityAndCheck(trader.seed, newTokenAsssetId, inputCoreAmount, inputTokenAmount)
        } 

        // remove liquidity and check
        for (let index = 0; index < traderList.length; index++) {
            let trader = traderList[index]
            mlog.log(`---------------------- removeLiquidity (${trader.seed})`)
            let txResult = null
            let removeLiquidity = await cennzx.getLiquidityBalance(trader.seed, newTokenAsssetId)
            await cennzx.removeLiquidityAndCheck(trader.seed, newTokenAsssetId, removeLiquidity)
        }
    });

    it.skip(`TODO: Continuously do swap tx`, async function () {

    });

    it.only('Continuously do output swap tx', async function () {

        const tokenAmount = tokenTotalAmount
        const poolTokenBalance  = tokenAmount
        const poolCoreBalance   = BN(10).toFixed()

        const trader = 'Alice'
        const amountSell = BN(2).toFixed()

        // create new token and exchange pool
        const newTokenAsssetId = await createTokenAndPool(tokenIssuerSeed, tokenAmount, poolTokenBalance, poolCoreBalance)

        // swap
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapInput
        mp.traderSeed = trader
        mp.assetIdSell = coreAsssetId
        mp.assetIdBuy = newTokenAsssetId
        mp.amountSell = amountSell
        mp.minAmountBuy = 1

        let apiPrice = await cennzx.getInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountSell)
        mlog.log('apiPrice =', apiPrice.toString())

        const formulaPrice = await cennzx.getFormulaInputPrice(mp.assetIdSell, mp.assetIdBuy, mp.amountSell)
        mlog.log('fmlPrice =', formulaPrice)

        // check price
        assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${apiPrice.toString()}) != formulaPrice(${formulaPrice})`)
            
        // do swap and check
        await cennzx.checkMethod(mp)
    });
});

async function createTokenAndPool(issureSeed, tokenAmount, poolTokenBalance, poolCoreBalance) {
    // create new token and exchange pool
    const newTokenAsssetId = (await ga.createNewToken(issureSeed, tokenAmount)).assetId.toString()
    await cennzx.addLiquidityAndCheck(issureSeed, newTokenAsssetId, poolTokenBalance, poolCoreBalance)
    return newTokenAsssetId
}