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
var tokenAsssetId_1 = -1
var tokenAsssetId_2 = -1
var tokenIssuerSeed = 'Bob'
const tokenTotalAmount = '200000000000000000'
var exchangeFeeRate = 0
const maxOutAmount      = '100000000000000'   
const tradeAmount       = '100000'

const poolCoreInitBal   = '200000000000'   // 200P
const poolTokenInitBal  = '100000000000'   // 100P

describe('CennzX test suite', function () {

    before( async function(){

        // get core asset id
        coreAsssetId = (await cennzx.getCoreAssetId()).toString()
        mlog.log('Core asset ID =', coreAsssetId)
        
        // create new token_1
        tokenAsssetId_1 = (await ga.createNewToken(tokenIssuerSeed, tokenTotalAmount)).assetId.toString()
        mlog.log('Create new token_1 ID =', tokenAsssetId_1)
        mlog.log('Pool address token_1 =', await cennzx.getExchangeAddress(tokenAsssetId_1))

        // const feeRate = (await cennzx.defaultFeeRate()).toString()
        // exchangeFeeRate = BN(feeRate).div('1000000')    // the feeRate is for per mill

        mlog.log('Exchange fee rate =', exchangeFeeRate.toString())

        // create new token_2
        tokenAsssetId_2 = (await ga.createNewToken(tokenIssuerSeed, tokenTotalAmount)).assetId.toString()
        mlog.log('Create new token_2 ID =', tokenAsssetId_2)
        mlog.log('Pool address token_2 =', await cennzx.getExchangeAddress(tokenAsssetId_2))

        // create pool for tokenAsssetId_2
        const txResult = await cennzx.addLiquidity(tokenIssuerSeed, tokenAsssetId_2, 2, poolTokenInitBal, poolCoreInitBal)
        assert(txResult.bSucc, `Call addLiquidity() failed. [MSG = ${txResult.message}]`)
        mlog.log(`Created the exchange pool for token ${tokenAsssetId_2}`)
    })

    it('Bob creates pool and liquidity for tokenAsssetId_1 [1st time to call addLiquidity()]', async function () {

        const traderSeed = tokenIssuerSeed // Bob
        const minLiquidityWanted = 2
        const maxAssetAmountInput = poolTokenInitBal
        const coreAmountInput = poolCoreInitBal

        // get all balances before tx
        const beforeTxBal = new cennzx.LiquidityBalance(traderSeed, tokenAsssetId_1)
        await beforeTxBal.getAll()
        // await beforeTxBal.displayInfo()

        // first add the liquidity for tokenAsssetId_1
        const txResult = await cennzx.addLiquidity(traderSeed, tokenAsssetId_1, minLiquidityWanted, maxAssetAmountInput, coreAmountInput)
        assert(txResult.bSucc, `Call addLiquidity() failed. [MSG = ${txResult.message}]`)

        // get tx fee
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = new cennzx.LiquidityBalance(traderSeed, tokenAsssetId_1)
        await afterTxBal.getAll()
        // await afterTxBal.displayInfo()

        // check issuer's token balance
        assert.equal(
            BN(afterTxBal.traderTokenAssetBal).toFixed(),
            BN(beforeTxBal.traderTokenAssetBal).minus(maxAssetAmountInput).toFixed(),
            `Token asset balance is wrong.`)
        // check issuer's core balance
        assert.equal(
            BN(afterTxBal.traderCoreAssetBal).toFixed(),
            BN(beforeTxBal.traderCoreAssetBal).minus(BN(coreAmountInput).plus(txFee)).toFixed(),
            `Core asset balance is wrong.`)
        // check core asset balance in exchange address
        assert.equal(BN(afterTxBal.poolCoreAsssetBal).toFixed(), BN(coreAmountInput).toFixed(),
            `Exchange core asset balance is wrong.`)
        // check token asset balance in exchange address
        assert.equal(BN(afterTxBal.poolTokenAsssetBal).toFixed(), BN(maxAssetAmountInput).toFixed(),
            `Exchange token asset balance is wrong.`)

        // check total liquidity
        assert.equal(BN(afterTxBal.totalLiquidity).toFixed(), BN(coreAmountInput).toFixed(), `Total liquidity is wrong.`)

        // check trader liquidity
        assert.equal(BN(afterTxBal.traderLiquidity).toFixed(), BN(coreAmountInput).toFixed(), `Trader's liquidity is wrong.`)
    });

    it('assetSwapOutput: coreAsssetId -> tokenAsssetId_1', async function () {
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = 'Alice'
        mp.assetIdSell = coreAsssetId
        mp.assetIdBuy = tokenAsssetId_1
        mp.amountBuy = tradeAmount
        mp.maxAmountSell = maxOutAmount

        await cennzx.checkMethod(mp)
    });

    it('assetSwapOutput: tokenAsssetId_1 -> coreAsssetId', async function () {
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = 'Alice'
        mp.assetIdSell = tokenAsssetId_1
        mp.assetIdBuy = coreAsssetId
        mp.amountBuy = tradeAmount
        mp.maxAmountSell = maxOutAmount

        await cennzx.checkMethod(mp)
    });

    it('assetSwapOutput: tokenAsssetId_2 -> tokenAsssetId_1', async function () {
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapOutput
        mp.traderSeed = 'Alice'
        mp.assetIdSell = tokenAsssetId_2
        mp.assetIdBuy = tokenAsssetId_1
        mp.amountBuy = tradeAmount
        mp.maxAmountSell = maxOutAmount

        // top up asset account
        await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.maxAmountSell, mp.assetIdSell)

        await cennzx.checkMethod(mp)
    });

    it('assetSwapInput: coreAsssetId -> tokenAsssetId_1', async function () {
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapInput
        mp.traderSeed = 'Alice'
        mp.assetIdSell = coreAsssetId
        mp.assetIdBuy = tokenAsssetId_1
        mp.amountSell = tradeAmount
        mp.minAmountBuy = '2'

        await cennzx.checkMethod(mp)
    });

    it('assetSwapInput: tokenAsssetId_1 -> coreAsssetId', async function () {
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapInput
        mp.traderSeed = 'Alice'
        mp.assetIdSell = tokenAsssetId_1
        mp.assetIdBuy = coreAsssetId
        mp.amountSell = tradeAmount
        mp.minAmountBuy = '2'

        await cennzx.checkMethod(mp)
    });

    it(`assetSwapInput: tokenAsssetId_2 -> tokenAsssetId_1`, async function () {
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetSwapInput
        mp.traderSeed = 'Alice'
        mp.assetIdSell = tokenAsssetId_2
        mp.assetIdBuy = tokenAsssetId_1
        mp.amountSell = tradeAmount
        mp.minAmountBuy = '2'

        // top up asset account
        await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.amountSell, mp.assetIdSell)

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferOutput: tokenAsssetId_1 -> coreAsssetId`, async function () {

        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetTransferOutput
        mp.traderSeed = 'Eve'
        mp.recipientSeed = 'Dave'
        mp.assetIdSell = tokenAsssetId_1
        mp.assetIdBuy = coreAsssetId
        mp.amountBuy = tradeAmount
        mp.maxAmountSell = maxOutAmount

        // top up assetSell account
        await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.maxAmountSell, mp.assetIdSell)

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferOutput: coreAsssetId -> tokenAsssetId_1`, async function () {

        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetTransferOutput
        mp.traderSeed = 'Eve'
        mp.recipientSeed = 'Dave'
        mp.assetIdSell = coreAsssetId
        mp.assetIdBuy = tokenAsssetId_1
        mp.amountBuy = tradeAmount
        mp.maxAmountSell = maxOutAmount

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferOutput: tokenAsssetId_2 -> tokenAsssetId_1`, async function () {

        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetTransferOutput
        mp.traderSeed = 'Eve'
        mp.recipientSeed = 'Dave'
        mp.assetIdSell = tokenAsssetId_2
        mp.assetIdBuy = tokenAsssetId_1
        mp.amountBuy = tradeAmount
        mp.maxAmountSell = maxOutAmount

        // top up assetSell account
        let txResult = await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.maxAmountSell, mp.assetIdSell)
        assert(txResult.bSucc, `Call transfer() failed. [MSG = ${txResult.message}]`)

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferInput: coreAsssetId -> tokenAsssetId_1`, async function () {
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetTransferInput
        mp.traderSeed = 'Eve'
        mp.recipientSeed = 'Dave'
        mp.assetIdSell = coreAsssetId
        mp.assetIdBuy = tokenAsssetId_1
        mp.amountSell = tradeAmount
        mp.minAmountBuy = '2'

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferInput: tokenAsssetId_1 -> coreAsssetId`, async function () {
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetTransferInput
        mp.traderSeed = 'Eve'
        mp.recipientSeed = 'Dave'
        mp.assetIdSell = tokenAsssetId_1
        mp.assetIdBuy = coreAsssetId
        mp.amountSell = tradeAmount
        mp.minAmountBuy = '2'

        // top up asset account
        await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.amountSell, mp.assetIdSell)

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferInput: tokenAsssetId_2 -> tokenAsssetId_1`, async function () {
        const mp = new cennzx.MethodParameter()
        mp.method = cennzx.assetTransferInput
        mp.traderSeed = 'Eve'
        mp.recipientSeed = 'Dave'
        mp.assetIdSell = tokenAsssetId_2
        mp.assetIdBuy = tokenAsssetId_1
        mp.amountSell = tradeAmount
        mp.minAmountBuy = '2'

        // top up asset account
        await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.amountSell, mp.assetIdSell)

        await cennzx.checkMethod(mp)
    });

    it('Pay tx fee with tokenAsssetId_2', async function () {

        const traderSeed = 'Bob'
        const payeeSeed = 'James'
        const transferAmt = '10000'
        const transferToken = tokenAsssetId_1
        const feeToken = tokenAsssetId_2
        const maxPayAmount = maxOutAmount

        let txResult = null
        let tokenSellAmount = 0

        // create tx
        const ga = await GA.initGA(traderSeed)
        const payeeAddress = node.getAddressFromSeed(payeeSeed)
        const tx = ga.transfer(transferToken, payeeAddress, transferAmt.toString())

        // add fee option
        tx.addFeeExchangeOpt({
            assetId: feeToken,
            maxPayment: maxPayAmount,
        });

        // balance before tx
        const transferTokenBal_beforeTx = await node.queryFreeBalance(traderSeed, transferToken)
        const feeTokenBal_beforeTx = await node.queryFreeBalance(traderSeed, feeToken)
        const coreBal_beforeTx = await node.queryFreeBalance(traderSeed, coreAsssetId)

        // sign tx and calculate fee token cost
        const signedTx = tx.sign(node.getAccount(traderSeed), await node.getNonce(traderSeed))
        const txByteLength = signedTx.encodedLength
        const estimatedCoreFee = await fee.calulateTxFee(txByteLength)
        const actualTokenCost = await cennzx.getOutputPrice(feeToken, coreAsssetId, estimatedCoreFee)

        // send tx
        // txResult = await node.signAndSendTx(tx, traderSeed)
        txResult = await node.signAndSendTx(tx, traderSeed)

        // get sell amount from events
        txResult.events.forEach(e => {
            if (e.event.method == 'AssetPurchase') {
                tokenSellAmount = e.event.data[3].toString()
            }
        })

        // balance after tx
        const transferTokenBal_afterTx = await node.queryFreeBalance(traderSeed, transferToken)
        const feeTokenBal_afterTx = await node.queryFreeBalance(traderSeed, feeToken)
        const coreBal_afterTx = await node.queryFreeBalance(traderSeed, coreAsssetId)

        // check payee transferToken balance
        assert.equal(transferTokenBal_afterTx, BN(transferTokenBal_beforeTx).minus(transferAmt).toFixed(),
            `Balance of transfer token is wrong.`)
        // check payer core balance
        assert.equal(coreBal_afterTx, coreBal_beforeTx,
            `Balance of core token is wrong.`)
        // check expected spend token fee
        assert.equal(tokenSellAmount.toString(), actualTokenCost.toString(), `The token amount to sell is wrong.`)
        // check payer feeToken balance 
        assert.equal(feeTokenBal_afterTx, BN(feeTokenBal_beforeTx).minus(actualTokenCost).toFixed(),
            `Balance of token to pay tx fee is wrong.`)
    });

    it('Alice adds new liquility into tokenAsssetId_1 [2nd time to call addLiquidity()]', async function () {
        const minLiquidityWanted = 2
        const coreAmountInput = tradeAmount
        const maxAssetAmountInput = maxOutAmount
        const traderSeed = 'Bob'

        // get all balances before tx
        const beforeTxBal = new cennzx.LiquidityBalance(traderSeed, tokenAsssetId_1, coreAsssetId)
        await beforeTxBal.getAll()
        // await beforeTxBal.displayInfo()

        const liquidityPrice = await cennzx.getAddLiquidityPrice(tokenAsssetId_1, coreAmountInput)
        // console.log('liquidityPrice =', liquidityPrice)

        /**
         * Calculate the estimated token amount added to pool.
         * - formular: token_added / token_pool = core_added / core_pool
         *             => token_added = token_pool * core_added / core_pool
         */
        // let estimatedTokenAmtAdded = beforeTxBal.poolTokenAsssetBal * coreAmountInput / beforeTxBal.poolCoreAsssetBal
        // estimatedTokenAmtAdded = Math.ceil(estimatedTokenAmtAdded)  // round up

        /**
         * Calculate the estimated liquidity increased
         * - formular: liquidity_minted = core_added * total_liquidity / core_pool
         * - note: the result should remove the digitals. (For all actions to add property into individual's account)
         */
        let estimatedLiquidityMinted = coreAmountInput * beforeTxBal.totalLiquidity / beforeTxBal.poolCoreAsssetBal
        estimatedLiquidityMinted = Math.floor(estimatedLiquidityMinted)  // round, only remove the digitals

        // add new liquidity
        const txResult = await cennzx.addLiquidity(traderSeed, tokenAsssetId_1, minLiquidityWanted, maxAssetAmountInput, coreAmountInput)
        assert(txResult.bSucc, `Call addLiquidity() failed. [MSG = ${txResult.message}]`)

        // get tx fee
        const txFee = txResult.txFee

        // get all balances after tx
        const afterTxBal = new cennzx.LiquidityBalance(traderSeed, tokenAsssetId_1, coreAsssetId)
        await afterTxBal.getAll()
        // await afterTxBal.displayInfo()
        // console.log('txFee =', txFee)
        

        // check issuer's token balance
        assert.equal(
            afterTxBal.traderTokenAssetBal,
            BN(beforeTxBal.traderTokenAssetBal).minus(liquidityPrice).toFixed(),
            `Trader's token asset balance is wrong.`)

        // check issuer's core balance
        assert.equal(
            afterTxBal.traderCoreAssetBal,
            BN(beforeTxBal.traderCoreAssetBal).minus(coreAmountInput).minus(txFee).toFixed(),
            `Trader's core asset balance is wrong.`)

        // check token amount in pool
        assert.equal(
            afterTxBal.poolTokenAsssetBal,
            BN(beforeTxBal.poolTokenAsssetBal).plus(liquidityPrice).toFixed(),
            `Pool token asset balance is wrong.`)

        // check core asset balance in exchange address
        assert.equal(
            afterTxBal.poolCoreAsssetBal,
            BN(beforeTxBal.poolCoreAsssetBal).plus(coreAmountInput).toFixed(),
            `Pool core asset balance is wrong.`)

        // check total liquidity
        assert.equal(
            afterTxBal.totalLiquidity,
            BN(beforeTxBal.totalLiquidity).plus(estimatedLiquidityMinted).toFixed(),
            `Total liquidity is wrong.`)

        // check trader liquidity
        assert.equal(
            afterTxBal.traderLiquidity,
            BN(beforeTxBal.traderLiquidity).plus(estimatedLiquidityMinted).toFixed(),
            `Trader's liquidity is wrong.`)
    });

    it('Bob remove liquidity', async function () {

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


