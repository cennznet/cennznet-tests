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
const BigNumber = require('big-number')
const mlog = require('mocha-logger')




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

var     coreAsssetId        = -1
var     tokenAsssetId_1     = -1
var     tokenAsssetId_2     = -1
var     tokenIssuerSeed     = 'Bob'
const   tokenTotalAmount    = '20000000000000000000'
var     exchangeFeeRate     = 0

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

    it('assetSwapOutput: coreAsssetId -> tokenAsssetId_1', async function() {
        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetSwapOutput
        mp.traderSeed      = 'Alice'
        mp.assetIdSell     = coreAsssetId
        mp.assetIdBuy      = tokenAsssetId_1
        mp.amountBuy       = '50000'
        mp.maxAmountSell   = '2000000'

        await cennzx.checkMethod(mp)
    });

    it('assetSwapOutput: tokenAsssetId_1 -> coreAsssetId', async function() {
        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetSwapOutput
        mp.traderSeed      = 'Alice'
        mp.assetIdSell     = tokenAsssetId_1
        mp.assetIdBuy      = coreAsssetId
        mp.amountBuy       = '1000'
        mp.maxAmountSell   = '20000'

        await cennzx.checkMethod(mp)
    });

    it('assetSwapOutput: tokenAsssetId_2 -> tokenAsssetId_1', async function() {
        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetSwapOutput
        mp.traderSeed      = 'Alice'
        mp.assetIdSell     = tokenAsssetId_2
        mp.assetIdBuy      = tokenAsssetId_1
        mp.amountBuy       = '1000'
        mp.maxAmountSell   = '20000'

        // top up asset account
        await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.maxAmountSell, mp.assetIdSell)

        await cennzx.checkMethod(mp)     
    });

    it('assetSwapInput: coreAsssetId -> tokenAsssetId_1', async function() {
        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetSwapInput
        mp.traderSeed      = 'Alice'
        mp.assetIdSell     = coreAsssetId
        mp.assetIdBuy      = tokenAsssetId_1
        mp.amountSell      = '10000'
        mp.minAmountBuy    = '2'

        await cennzx.checkMethod(mp)
    });

    it('assetSwapInput: tokenAsssetId_1 -> coreAsssetId', async function() {
        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetSwapInput
        mp.traderSeed      = 'Alice'
        mp.assetIdSell     = tokenAsssetId_1
        mp.assetIdBuy      = coreAsssetId
        mp.amountSell      = '5000'
        mp.minAmountBuy    = '2'

        await cennzx.checkMethod(mp) 
    });

    it(`assetSwapInput: tokenAsssetId_2 -> tokenAsssetId_1`, async function() {
        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetSwapInput
        mp.traderSeed      = 'Alice'
        mp.assetIdSell     = tokenAsssetId_2
        mp.assetIdBuy      = tokenAsssetId_1
        mp.amountSell      = '5000'
        mp.minAmountBuy    = '2'

        // top up asset account
        await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.amountSell, mp.assetIdSell)

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferOutput: tokenAsssetId_1 -> coreAsssetId`, async function() {

        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetTransferOutput
        mp.traderSeed      = 'Eve'
        mp.recipientSeed   = 'Dave'
        mp.assetIdSell     = tokenAsssetId_1
        mp.assetIdBuy      = coreAsssetId
        mp.amountBuy       = '1000'
        mp.maxAmountSell   = '20000'

        // top up assetSell account
        await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.maxAmountSell, mp.assetIdSell)

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferOutput: coreAsssetId -> tokenAsssetId_1`, async function() {

        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetTransferOutput
        mp.traderSeed      = 'Eve'
        mp.recipientSeed   = 'Dave'
        mp.assetIdSell     = coreAsssetId
        mp.assetIdBuy      = tokenAsssetId_1
        mp.amountBuy       = '1000'
        mp.maxAmountSell   = '20000'

        // top up assetSell account
        // let txResult = await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.maxAmountSell, mp.assetIdSell)
        // assert(txResult.bSucc, `Call transfer() failed. [MSG = ${txResult.message}]`)

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferOutput: tokenAsssetId_2 -> tokenAsssetId_1`, async function() {

        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetTransferOutput
        mp.traderSeed      = 'Eve'
        mp.recipientSeed   = 'Dave'
        mp.assetIdSell     = tokenAsssetId_2
        mp.assetIdBuy      = tokenAsssetId_1
        mp.amountBuy       = '1000'
        mp.maxAmountSell   = '20000'

        // top up assetSell account
        let txResult = await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.maxAmountSell, mp.assetIdSell)
        assert(txResult.bSucc, `Call transfer() failed. [MSG = ${txResult.message}]`)

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferInput: coreAsssetId -> tokenAsssetId_1`, async function() {
        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetTransferInput
        mp.traderSeed      = 'Eve'
        mp.recipientSeed   = 'Dave'
        mp.assetIdSell     = coreAsssetId
        mp.assetIdBuy      = tokenAsssetId_1
        mp.amountSell      = '10000'
        mp.minAmountBuy    = '2'

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferInput: tokenAsssetId_1 -> coreAsssetId`, async function() {
        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetTransferInput
        mp.traderSeed      = 'Eve'
        mp.recipientSeed   = 'Dave'
        mp.assetIdSell     = tokenAsssetId_1
        mp.assetIdBuy      = coreAsssetId
        mp.amountSell      = '10000'
        mp.minAmountBuy    = '2'

        // top up asset account
        await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.amountSell, mp.assetIdSell)

        await cennzx.checkMethod(mp)
    });

    it(`assetTransferInput: tokenAsssetId_2 -> tokenAsssetId_1`, async function() {
        const mp = new cennzx.MethodParameter()
        mp.method          = cennzx.assetTransferInput
        mp.traderSeed      = 'Eve'
        mp.recipientSeed   = 'Dave'
        mp.assetIdSell     = tokenAsssetId_2
        mp.assetIdBuy      = tokenAsssetId_1
        mp.amountSell      = '10000'
        mp.minAmountBuy    = '2'

        // top up asset account
        await node.transfer(tokenIssuerSeed, mp.traderSeed, mp.amountSell, mp.assetIdSell)

        await cennzx.checkMethod(mp)
    });
    
    it.only('TODO: Pay tx fee with the new-created asset', async function() {

        let txResult = null
        const GA  = require('../../api/ga')
        const traderSeed    = 'Bob'
        const payeeSeed     = 'James'
        const amount        = '10000'
        const transferToken = coreAsssetId
        const tokenForFee   = tokenAsssetId_1
        const maxPayAmount  = 50000

        // create tx
        const ga = await GA.initGA(traderSeed)
        const payeeAddress = node.getAddressFromSeed(payeeSeed)
        const tx = ga.transfer(transferToken, payeeAddress, amount.toString())

        // sign and send tx
        txResult = await node.signAndSendTx(tx, traderSeed)
        console.log('txResult.fee 1 =', txResult.txFee)

        // add fee option
        tx.addFeeExchangeOpt({
            assetId: tokenForFee,
            maxPayment: maxPayAmount,
        });

        const poolAddress = await cennzx.getExchangeAddress(tokenAsssetId_1)

        console.log('bal coreAsssetId =', await node.queryFreeBalance(traderSeed, coreAsssetId))
        console.log('bal tokenAsssetId_1 =', await node.queryFreeBalance(traderSeed, tokenAsssetId_1))
        console.log('pool bal coreAsssetId =', await node.queryFreeBalance(poolAddress, coreAsssetId))
        console.log('pool bal tokenAsssetId_1 =', await node.queryFreeBalance(poolAddress, tokenAsssetId_1))


        // sign and send tx
        txResult = await node.signAndSendTx(tx, traderSeed)
        console.log('txResult.fee 2 =', txResult.txFee)

        const expectSpendTokenFee = await fee.calulateTxFee(txResult.byteLength)

        txResult.events.forEach(e => {
            if(e.event.method == 'AssetPurchase') {
                console.log(e.event.data[0].toString()) // sell id
                console.log(e.event.data[1].toString()) // buy id
                console.log(e.event.data[2].toString()) // account address
                console.log(e.event.data[3].toString()) // buy amount
                console.log(e.event.data[4].toString()) // sell amount
            }
        })

        // TODO: check payee transferToken balance
        // TODO: check payer tokenForFee balance 
        // TODO: check payer core balance
        // TODO: check expected spend token fee
        // TODO: check real token fee
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


