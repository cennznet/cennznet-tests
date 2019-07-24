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
const { CennzxSpot } = require('@cennznet/crml-cennzx-spot')
const node = require('./node')
const { bootNodeApi } = require('./websocket');
const fee = require('./fee');
const BN = require('bignumber.js')
const mlog = require('mocha-logger')


function MethodParameter(){
    this.method         = ''        
    this.traderSeed     = ''
    this.recipientSeed  = ''
    this.assetIdSell    = ''
    this.assetIdBuy     = ''
    this.amountSell     = 0
    this.amountBuy      = 0
    this.maxAmountSell  = '999999999'
    this.minAmountBuy   = 1
}

class SpotXBalance{
    /**
     * @param {MethodParameter} methodParameter
     */
    constructor(methodParameter){ 
        methodParameter ? methodParameter : methodParameter = new MethodParameter()

        this.traderSeed = methodParameter.traderSeed
        this.recipientSeed = methodParameter.recipientSeed
        this.assetIdSell = methodParameter.assetIdSell
        this.assetIdBuy = methodParameter.assetIdBuy
        this.amountBuy = methodParameter.amountBuy
        this.amountSell = methodParameter.amountSell
        
        this.trader_assetCore_bal = 0
        this.trader_assetSell_bal = 0
        this.trader_assetBuy_bal  = 0
        this.trader_poolAssetSell_liquidity = 0
        this.trader_poolAssetBuy_liquidity  = 0

        this.recipient_assetCore_bal = 0
        this.recipient_assetSell_bal = 0
        this.recipient_assetBuy_bal  = 0
        this.recipient_poolAssetSell_liquidity = 0
        this.recipient_poolAssetBuy_liquidity  = 0

        this.poolAssetSell_assetCore_bal = 0
        this.poolAssetSell_assetSell_bal = 0

        this.poolAssetBuy_assetCore_bal = 0
        this.poolAssetBuy_assetBuy_bal  = 0

        this.totalLiquidity_assetSell = 0
        this.totalLiquidity_assetBuy  = 0

        this.coreAssetId = ''
    }
    
    // get al balances and liquidities
    async fetchAll(){
        this.coreAssetId = await getCoreAssetId()
        const poolAddress_assetSell = await getExchangeAddress(this.assetIdSell)
        const poolAddress_assetBuy = await getExchangeAddress(this.assetIdBuy)

        this.trader_assetCore_bal = await node.queryFreeBalance(this.traderSeed, this.coreAssetId)
        this.trader_assetSell_bal = await node.queryFreeBalance(this.traderSeed, this.assetIdSell)
        this.trader_assetBuy_bal  = await node.queryFreeBalance(this.traderSeed, this.assetIdBuy)
        this.trader_poolAssetSell_liquidity = await getLiquidityBalance(this.traderSeed, this.assetIdSell)
        this.trader_poolAssetBuy_liquidity  = await getLiquidityBalance(this.traderSeed, this.assetIdBuy)

        if (this.recipientSeed != ''){
            this.recipient_assetCore_bal = await node.queryFreeBalance(this.recipientSeed, this.coreAssetId)
            this.recipient_assetSell_bal = await node.queryFreeBalance(this.recipientSeed, this.assetIdSell)
            this.recipient_assetBuy_bal  = await node.queryFreeBalance(this.recipientSeed, this.assetIdBuy)
            this.recipient_poolAssetSell_liquidity = await getLiquidityBalance(this.recipientSeed, this.assetIdSell)
            this.recipient_poolAssetBuy_liquidity  = await getLiquidityBalance(this.recipientSeed, this.assetIdBuy)
        }
        
        this.poolAssetSell_assetCore_bal = await node.queryFreeBalance(poolAddress_assetSell, this.coreAssetId)
        this.poolAssetSell_assetSell_bal = await node.queryFreeBalance(poolAddress_assetSell, this.assetIdSell)

        this.poolAssetBuy_assetCore_bal = await node.queryFreeBalance(poolAddress_assetBuy, this.coreAssetId)
        this.poolAssetBuy_assetBuy_bal  = await node.queryFreeBalance(poolAddress_assetBuy, this.assetIdBuy)

        this.totalLiquidity_assetSell = await getTotalLiquidity(this.assetIdSell)
        this.totalLiquidity_assetBuy  = await getTotalLiquidity(this.assetIdBuy)
    }

    async displayAll(){
        mlog.log('==========================')
        Object.keys(this).forEach(v => {
            let printValueBN = BN(this[v])
            // check if it's a number
            if (printValueBN.isNaN()){
                mlog.log(`${v} = ${this[v]}`)
            }else{
                mlog.log(`${v} = ${BN(this[v]).toFixed()}`)
            }
        })
    }
}

class BalanceChecker{
    /**
     * 
     * @param {MethodParameter} methodPara 
     */
    constructor(methodPara, debugFlag = false){
        this.debugFlag = debugFlag

        this.methodPara = methodPara

        this.isTxSell = false 
        this.isTransfer = false

        this.beforeTxBal = null
        this.afterTxBal = null
        this.txFee = 0

        // swap price
        this.priceBuy_assetSellToBuy = 0
        this.priceBuy_assetCoreToBuy = 0
        this.priceSell_assetSellToBuy = 0
        this.priceSell_assetSellToCore = 0

        // balance change amount
        this.assetSell_bal_change = 0
        this.assetSell_bal_change = 0
        this.pool_assetCore_bal_change = 0
    }

    _checkBalance(){
        if (this.beforeTxBal == '' || this.afterTxBal == ''){
            assert(false, `Balance set is empty.`)
        }

        if (this.isTransfer == true ){
            assert.notEqual(this.methodPara.recipientSeed, '', `No recipient seed found.`)
        }

        // make expectedBal point to beforeTxBal
        const copyBeforeTxBal = this.beforeTxBal
        const expectedBal = copyBeforeTxBal

        // put each value into an object {value: xxx} in order to use object's reference in the code below
        Object.keys(expectedBal).forEach(v => {
            expectedBal[v] = {value: expectedBal[v]}
        })

        // get all same token variable point to same object
        if ( copyBeforeTxBal.assetIdSell.value == copyBeforeTxBal.coreAssetId.value ){
            expectedBal.assetIdSell = expectedBal.coreAssetId
            expectedBal.trader_assetSell_bal = expectedBal.trader_assetCore_bal
            expectedBal.recipient_assetSell_bal = expectedBal.recipient_assetCore_bal
            expectedBal.poolAssetSell_assetSell_bal = expectedBal.poolAssetSell_assetCore_bal
        }
        if ( copyBeforeTxBal.assetIdBuy.value == copyBeforeTxBal.coreAssetId.value ){
            expectedBal.assetIdBuy = expectedBal.coreAssetId
            expectedBal.trader_assetBuy_bal = expectedBal.trader_assetCore_bal
            expectedBal.recipient_assetBuy_bal = expectedBal.recipient_assetCore_bal
            expectedBal.poolAssetBuy_assetBuy_bal = expectedBal.poolAssetBuy_assetCore_bal
        }

        // get the value change according to different scenarios
        if (this.isTxSell){ // tx sell 
            this.assetBuy_bal_change = this.priceSell_assetSellToBuy
            this.assetSell_bal_change = copyBeforeTxBal.amountSell.value
            this.pool_assetCore_bal_change = this.priceSell_assetSellToCore
        }
        else{ // tx buy 
            this.assetBuy_bal_change = copyBeforeTxBal.amountBuy.value
            this.assetSell_bal_change = this.priceBuy_assetSellToBuy
            this.pool_assetCore_bal_change = this.priceBuy_assetCoreToBuy
        }

        /**
          * Calculate expected balance
          */
        expectedBal.trader_assetCore_bal.value = BN(copyBeforeTxBal.trader_assetCore_bal.value).minus(this.txFee)
        expectedBal.trader_assetSell_bal.value = BN(copyBeforeTxBal.trader_assetSell_bal.value).minus(this.assetSell_bal_change)
        expectedBal.trader_assetBuy_bal.value = BN(copyBeforeTxBal.trader_assetBuy_bal.value).plus(this.assetBuy_bal_change)
        expectedBal.trader_poolAssetSell_liquidity.value = BN(copyBeforeTxBal.trader_poolAssetSell_liquidity.value)
        expectedBal.trader_poolAssetBuy_liquidity.value = BN(copyBeforeTxBal.trader_poolAssetBuy_liquidity.value)

        expectedBal.poolAssetSell_assetCore_bal.value = BN(copyBeforeTxBal.poolAssetSell_assetCore_bal.value).minus(this.pool_assetCore_bal_change)
        expectedBal.poolAssetSell_assetSell_bal.value = BN(copyBeforeTxBal.poolAssetSell_assetSell_bal.value).plus(this.assetSell_bal_change)
        expectedBal.poolAssetBuy_assetCore_bal.value = BN(copyBeforeTxBal.poolAssetBuy_assetCore_bal.value).plus(this.pool_assetCore_bal_change)
        expectedBal.poolAssetBuy_assetBuy_bal.value = BN(copyBeforeTxBal.poolAssetBuy_assetBuy_bal.value).minus(this.assetBuy_bal_change)

        expectedBal.totalLiquidity_assetSell.value = BN(copyBeforeTxBal.totalLiquidity_assetSell.value)
        expectedBal.totalLiquidity_assetBuy.value = BN(copyBeforeTxBal.totalLiquidity_assetBuy.value)

        if ( this.isTransfer ){
            expectedBal.recipient_assetCore_bal.value = BN(copyBeforeTxBal.recipient_assetCore_bal.value)
            expectedBal.recipient_assetSell_bal.value = BN(copyBeforeTxBal.recipient_assetSell_bal.value)
            expectedBal.recipient_assetBuy_bal.value = BN(copyBeforeTxBal.recipient_assetBuy_bal.value).plus(this.assetBuy_bal_change)
            expectedBal.recipient_poolAssetSell_liquidity.value = BN(copyBeforeTxBal.recipient_poolAssetSell_liquidity.value)
            expectedBal.recipient_poolAssetBuy_liquidity.value = BN(copyBeforeTxBal.recipient_poolAssetBuy_liquidity.value)
            
            // deduct the transfer amount
            expectedBal.trader_assetBuy_bal.value = BN(expectedBal.trader_assetBuy_bal.value).minus(this.assetBuy_bal_change)
        }

        // change the value format back to normal
        Object.keys(expectedBal).forEach(v => {
            expectedBal[v] = expectedBal[v].value.toString()
        })

        // expectedBal.displayAll()

        // check all values
        Object.keys(expectedBal).forEach(v => {
            assert.equal(BN(this.afterTxBal[v]).toFixed(), BN(expectedBal[v]).toFixed(), `The value of [${v}] is wrong.`)
        })
    }

    // get swap prices
    async _getSwapPrice() {
        if (this.beforeTxBal == null){
            return
        }

        const coreAssetId = this.beforeTxBal.coreAssetId
        const assetIdSell = this.beforeTxBal.assetIdSell
        const assetIdBuy = this.beforeTxBal.assetIdBuy
        const amountBuy = this.beforeTxBal.amountBuy
        const amountSell = this.beforeTxBal.amountSell

        this.priceBuy_assetSellToBuy = await getOutputPrice(assetIdSell, assetIdBuy, amountBuy)
        this.priceSell_assetSellToBuy = await getInputPrice(assetIdSell, assetIdBuy, amountSell)
        this.priceBuy_assetCoreToBuy = await getOutputPrice(coreAssetId, assetIdBuy, amountBuy)
        this.priceSell_assetSellToCore = await getInputPrice(assetIdSell, coreAssetId, amountSell)
    }

    printAllPrice(){
        mlog.log('priceBuy_assetSellToBuy =', this.priceBuy_assetSellToBuy.toString())
        mlog.log('priceBuy_assetCoreToBuy =', this.priceBuy_assetCoreToBuy.toString())
        mlog.log('priceSell_assetSellToBuy =', this.priceSell_assetSellToBuy.toString())
        mlog.log('priceSell_assetSellToCore =', this.priceSell_assetSellToCore.toString())
    }

    /**
     * Run cennzxspot method and check all relevant balances and liquidities. 
     */
    async doCheck() {
        const methodPara = this.methodPara
        let txResult = {}
        const methodName = methodPara.method.name

        // get balances before tx
        this.beforeTxBal = new SpotXBalance(methodPara)
        await this.beforeTxBal.fetchAll()
        
        // get swap price
        await this._getSwapPrice()

        if ( this.debugFlag ){
            mlog.log('methodName =', methodName)
            this.beforeTxBal.displayAll()
            this.printAllPrice()
        }

        // run method
        if (methodName.indexOf('Input') >= 0) {
            this.isTxSell = true

            // check price
            const apiPrice = await getInputPrice(methodPara.assetIdSell, methodPara.assetIdBuy, methodPara.amountSell)
            const formulaPrice = await getFormulaInputPrice(methodPara.assetIdSell, methodPara.assetIdBuy, methodPara.amountSell)
            assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
                `apiPriceInput(${apiPrice}) != formulaPriceInput(${formulaPrice})`)

            // run the method
            if (methodName.indexOf('Transfer') >= 0) {
                this.isTransfer = true
                txResult = await methodPara.method(
                    methodPara.traderSeed, methodPara.recipientSeed, methodPara.assetIdSell, methodPara.assetIdBuy, methodPara.amountSell, methodPara.minAmountBuy
                )
            }
            else {
                this.isTransfer = false
                txResult = await methodPara.method(
                    methodPara.traderSeed, methodPara.assetIdSell, methodPara.assetIdBuy, methodPara.amountSell, methodPara.minAmountBuy
                )
            }
        }
        else if (methodName.indexOf('Output') >= 0) {
            this.isTxSell = false

            // check price
            const apiPrice = await getOutputPrice(methodPara.assetIdSell, methodPara.assetIdBuy, methodPara.amountSell)
            const formulaPrice = await getFormulaOutputPrice(methodPara.assetIdSell, methodPara.assetIdBuy, methodPara.amountSell)
            assert(BN(formulaPrice).minus(apiPrice).absoluteValue().isLessThanOrEqualTo(1), 
                `apiPriceOutput(${apiPrice}) != formulaPriceOutput(${formulaPrice})`)

            // run the method
            if (methodName.indexOf('Transfer') >= 0) {
                this.isTransfer = true
                txResult = await methodPara.method(
                    methodPara.traderSeed, methodPara.recipientSeed, methodPara.assetIdSell, methodPara.assetIdBuy, methodPara.amountBuy, methodPara.maxAmountSell
                )
            }
            else {
                this.isTransfer = false
                txResult = await methodPara.method(
                    methodPara.traderSeed, methodPara.assetIdSell, methodPara.assetIdBuy, methodPara.amountBuy, methodPara.maxAmountSell
                )
            }
        }
        else {
            assert(false, `Method [${methodName}] is not in the checking scope.`)
        }

        // check transaction result
        assert(txResult.bSucc, `Call method(${methodName}) failed. [MSG = ${txResult.message}]`)
        // check specified event
        const bSucc = checkTxEvent(txResult, 'AssetPurchase')
        if (bSucc){
            txResult.bSucc = true
            txResult.txFee = await fee.queryTxFee(txResult.blockHash, txResult.extrinsicIndex)
        }
        else{
            txResult.bSucc = false
        }

        this.txFee = txResult.txFee

        // get balances after tx
        this.afterTxBal = new SpotXBalance(methodPara)
        await this.afterTxBal.fetchAll()
        if (this.debugFlag){
            mlog.log('txFee =', this.txFee)
            this.afterTxBal.displayAll()
        }

        this._checkBalance()

        return txResult
    }
}

class LiquidityBalance{

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
            this.coreId = (await getCoreAssetId()).toString()
        }
        
        // get balances
        if (this.tokenId >= 0){
            if ( this.poolAddress == null || this.poolAddress.length != 48 ){    // 48 is the address length
                this.poolAddress = await getExchangeAddress(this.tokenId)
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
        this.traderLiquidity    = await getLiquidityBalance(this.traderSeed, this.tokenId )
        // get total liquidity
        this.totalLiquidity     = await getTotalLiquidity(this.tokenId)

        return this
    }

    async displayInfo(){
        // await this.getAll()
        // display all member
        mlog.log(`>>>>>>>>>>>>>>>>>>>>>>>>`)
        Object.keys(this).forEach(v => {
            mlog.log(`${v} = ${this[v].toString()}`)
        })
        mlog.log(`<<<<<<<<<<<<<<<<<<<<<<<<`)
    }
}

/**
 * Run cennzxspot method and check all relevant balances and liquidities. 
 * @param {MethodParameter} methodInput 
 */
async function checkMethod(methodPara, debugFlag = false){
    const checker = new BalanceChecker(methodPara, debugFlag)
    const txResult = await checker.doCheck()
    return txResult
}


async function initSpotX(nodeApi = bootNodeApi){
    const api = await nodeApi.getApi()
    // await node.setApiSigner(api, traderSeed)
    const spotX = await CennzxSpot.create(api)
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
 * @param minLiquidity: the minimum liquidity value wanted
 * @param maxAssetAmount: the max amount to add in pool, should be smaller than trader's asset balance. 
 *                   If the calulated amount is greater then it, tx will get failure.
 *                  Note:
 *                      - In terms of the caculation and digital round fact, maxAssetAmount must be 1 larger than theoretical max value.
 *                        e.g. If 5000 is the max value, the maxAssetAmount should be at least 5001.
 *                      - For the first call, maxAssetAmount will be the initial liquidity.
 *                      - For later calls, actual asset amount input should meet the formula: new_token_amt / token_pool_amt = new_core_amt / core_pool_amt.
 *                              This is for keep the proportion of the token and core.
 * @param coreAmount: the exact core asset amount to add into pool. This value is the initial liquidity.
 */
async function addLiquidity(traderSeed, assetId, minLiquidity, maxAssetAmount, coreAmount, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)

    const trans = spotX.addLiquidity(assetId, minLiquidity, maxAssetAmount, coreAmount, 10)

    const txResult = await node.signAndSendTx(trans, traderSeed)

    let isCreated = false

    // check if the expected event appeared
    if (!checkTxEvent(txResult, 'AddLiquidity')){
        txResult.bSucc = false
    }

    return txResult
}

/**
 * Burn exchange tokens to withdraw core asset and trade asset at current ratio
 * @ assetAmount: amount of exchange token to be burned. This is the liquidity that will be definitely deducted from trader's liquidity and total liquidity.
 * @ minAssetWithdraw: minimum core asset withdrawn. If actual asset amount withdrawed is lower than this value, tx will get failure.
 * @ minCoreWithdraw: minimum trade asset withdrawn. If actual core amount withdrawded is lower than this value, tx will get failure.
 */
async function removeLiquidity(traderSeed, assetId, assetAmount, minAssetWithdraw, minCoreWithdraw, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)

    const trans = spotX.removeLiquidity(assetId, assetAmount, minAssetWithdraw, minCoreWithdraw)

    const txResult = await node.signAndSendTx(trans, traderSeed)

    // check if the expected event appeared
    if (!checkTxEvent(txResult, 'RemoveLiquidity')){
        txResult.bSucc = false
    }

    return txResult
}

/**
 * Add liquidity and check result
 * @param {*} traderSeed 
 * @param {*} tokenId 
 * @param {*} tokenAmountInput: for creating pool, it's the token amount; for add more liquidity, it's calculated by {coreAmountInput}.
 * @param {*} coreAmountInput 
 */
async function addLiquidityAndCheck(traderSeed, tokenId, tokenAmountInput, coreAmountInput ) {

    let txResult = null
    const poolTokenBal = await getPoolAssetBalance(tokenId)
    const poolCoreBal = await getPoolCoreAssetBalance(tokenId)

    if (BN(poolTokenBal).lte(0) || BN(poolCoreBal).lte(0)){ // empty pool means it hasn't been created
    // create pool    
        const beforeTxInfo = new LiquidityBalance(traderSeed, tokenId)
        await beforeTxInfo.getAll()
        mlog.log('-- status before create liquidity pool:')
        await beforeTxInfo.displayInfo()

        mlog.log(`add poolTokenBalance = ${tokenAmountInput}`)
        mlog.log(`add poolCoreBalance = ${coreAmountInput}`)

        txResult = await addLiquidity(traderSeed, tokenId, 1, tokenAmountInput, coreAmountInput)
        assert.equal(txResult.bSucc, true, `addLiquidity() created pool failed. (${traderSeed})`)
        mlog.log(`txResult.fee = ${txResult.txFee}`)

        const afterTxInfo = new LiquidityBalance(traderSeed, tokenId)
        await afterTxInfo.getAll()
        mlog.log('-- status after create liquidity pool:')
        await afterTxInfo.displayInfo()

        // check issuer's token balance
        assert.equal(
            afterTxInfo.traderTokenAssetBal,
            BN(beforeTxInfo.traderTokenAssetBal).minus(tokenAmountInput).toFixed(),
            `Token token balance is wrong. ${traderSeed}`)

        // check issuer's core balance
        assert.equal(
            afterTxInfo.traderCoreAssetBal,
            BN(beforeTxInfo.traderCoreAssetBal).minus(coreAmountInput).minus(txResult.txFee).toFixed(),
            `Core balance is wrong. ${traderSeed}`)

        // check pool core balance
        assert.equal(
            afterTxInfo.poolCoreAsssetBal, 
            BN(coreAmountInput).toFixed(),
            `Exchange core asset balance is wrong.${traderSeed}`)
        // check pool token balance
        assert.equal(
            afterTxInfo.poolTokenAsssetBal, 
            BN(tokenAmountInput).toFixed(),
            `Exchange token asset balance is wrong.${traderSeed}`)

        // check total liquidity
        assert.equal(
            afterTxInfo.totalLiquidity, 
            BN(coreAmountInput).toFixed(), 
            `Total liquidity is wrong.${traderSeed}`)

        // check trader liquidity
        assert.equal(
            afterTxInfo.traderLiquidity, 
            BN(coreAmountInput).toFixed(), 
            `Trader's liquidity is wrong.${traderSeed}`)
    }
    else{ // add liquidity
        // get core amount via inputing token
        const inputCoreAmount = coreAmountInput
        const inputTokenAmount = await getAddLiquidityPrice(tokenId, coreAmountInput)

        const formulaTokenPrice = await getAddLiquidityPrice_formula(tokenId, coreAmountInput)

        mlog.log(`input CoreAmount          = ${inputCoreAmount}`)
        mlog.log(`api TokenAmount price     = ${inputTokenAmount}`)
        mlog.log(`formula TokenAmount price = ${inputTokenAmount}`)

        let beforeTxInfo = new LiquidityBalance(traderSeed, tokenId)
        await beforeTxInfo.getAll()
        mlog.log('-- status before addLiquidity:')
        await beforeTxInfo.displayInfo()

        // expect(BN(inputTokenAmount)).to.be.gt(BN(beforeTxInfo.traderTokenAssetBal), `(${traderSeed}) Token balance is not sufficient.`)
        if ( BN(inputTokenAmount).gt(beforeTxInfo.traderTokenAssetBal) ){
            assert(false, `(${traderSeed}) Token balance(${beforeTxInfo.traderTokenAssetBal}) is smaller than need (${inputTokenAmount}).`)
        }

        txResult = await addLiquidity(traderSeed, tokenId, 1, inputTokenAmount, inputCoreAmount)
        assert.equal(txResult.bSucc, true,`addLiquidity() add new liquidity failed. (${traderSeed})`)

        mlog.log(`txResult.fee = ${txResult.txFee}`)

        let afterTxInfo = new LiquidityBalance(traderSeed, tokenId)
        await afterTxInfo.getAll()
        mlog.log('-- status after addLiquidity:')
        await afterTxInfo.displayInfo()
        
        // price
        assert(BN(formulaTokenPrice).minus(inputTokenAmount).absoluteValue().isLessThanOrEqualTo(1), 
            `apiPrice(${inputTokenAmount}) != formulaPrice(${formulaTokenPrice})`)
        assert.equal(
            afterTxInfo.poolCoreAsssetBal,
            BN(beforeTxInfo.poolCoreAsssetBal).plus(inputCoreAmount).toFixed(),
            `poolCoreAsssetBal is wrong (${traderSeed})`)
        assert.equal(
            afterTxInfo.poolTokenAsssetBal,
            BN(beforeTxInfo.poolTokenAsssetBal).plus(inputTokenAmount).toFixed(),
            `poolTokenAsssetBal is wrong (${traderSeed})`)
        assert.equal(
            afterTxInfo.totalLiquidity,
            BN(beforeTxInfo.totalLiquidity).plus(inputCoreAmount).toFixed(),
            `totalLiquidity is wrong (${traderSeed})`)
        assert.equal(
            afterTxInfo.traderLiquidity, 
            BN(beforeTxInfo.traderLiquidity).plus(inputCoreAmount).toFixed(),
            `trader liquidity is wrong (${traderSeed})`)
        assert.equal(
            afterTxInfo.traderCoreAssetBal, 
            BN(beforeTxInfo.traderCoreAssetBal).minus(txResult.txFee).minus(inputCoreAmount).toFixed(), 
            `traderCoreAssetBal is wrong (${traderSeed})`)
        assert.equal(
            afterTxInfo.traderTokenAssetBal,
            BN(beforeTxInfo.traderTokenAssetBal).minus(inputTokenAmount).toFixed(),
            `traderTokenAssetBal is wrong (${traderSeed})`)
    }
}

async function removeLiquidityAndCheck(traderSeed, tokenId, burnedAmount) {

    const removePrice = await getRemoveLiquidityPrice(traderSeed, tokenId, burnedAmount)

    const beforeTxInfo = new LiquidityBalance(traderSeed, tokenId)
    await beforeTxInfo.getAll()
    mlog.log('-- status before removeLiquidity:')
    await beforeTxInfo.displayInfo()

    mlog.log('burnedAmount =', burnedAmount)
    mlog.log('removeCoreAmount =', removePrice.coreAmount)
    mlog.log('removeTokenAmount =', removePrice.tokenAmount)

    const txResult = await removeLiquidity(traderSeed, tokenId, burnedAmount, 1, 1)
    assert.equal(txResult.bSucc, true, `removeLiquidity failed for ${traderSeed}`)
    mlog.log('removeLiquidity result =', txResult.bSucc)

    // get tx fee
    const txFee = txResult.txFee
    mlog.log('txFee =', txFee)
    
    const afterTxInfo = new LiquidityBalance(traderSeed, tokenId)
    await afterTxInfo.getAll()
    mlog.log('-- status after removeLiquidity:')
    await afterTxInfo.displayInfo()

    assert.equal(
        afterTxInfo.poolCoreAsssetBal,
        BN(beforeTxInfo.poolCoreAsssetBal).minus(removePrice.coreAmount).toFixed(),
        `poolCoreAsssetBal is wrong (${traderSeed})`)

    // assert(
    //     BN(beforeTxInfo.poolTokenAsssetBal).minus(removePrice.tokenAmount).minus(afterTxInfo.poolTokenAsssetBal).absoluteValue().isLessThanOrEqualTo(1),
    //     `poolTokenAsssetBal(${afterTxInfo.poolTokenAsssetBal}) is wrong (expected = ${BN(beforeTxInfo.poolTokenAsssetBal).minus(removePrice.tokenAmount).toFixed()}). [${tokenId}]`)

    assert.equal(
        afterTxInfo.poolTokenAsssetBal,
        BN(beforeTxInfo.poolTokenAsssetBal).minus(removePrice.tokenAmount).toFixed(),
        `poolTokenAsssetBal(${afterTxInfo.poolTokenAsssetBal}) is wrong (${traderSeed})`)

    assert.equal(
        afterTxInfo.totalLiquidity,
        BN(beforeTxInfo.totalLiquidity).minus(burnedAmount).toFixed(),
        `totalLiquidity is wrong (${traderSeed})`)

    assert.equal(
        afterTxInfo.traderLiquidity, 
        BN(beforeTxInfo.traderLiquidity).minus(burnedAmount).toFixed(),
        `trader liquidity is wrong (${traderSeed})`)

    assert.equal(
        afterTxInfo.traderCoreAssetBal, 
        BN(beforeTxInfo.traderCoreAssetBal).minus(txResult.txFee).plus(removePrice.coreAmount).toFixed(), 
        `traderCoreAssetBal is wrong (${traderSeed})`)

    assert.equal(
        afterTxInfo.traderTokenAssetBal,
        BN(beforeTxInfo.traderTokenAssetBal).plus(removePrice.tokenAmount).toFixed(),
        `traderTokenAssetBal is wrong (${traderSeed})`)
}

async function getAddLiquidityPrice(assetId, amount, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    const liquidity_price = await spotX.liquidityPrice(assetId, amount)
    return liquidity_price.toString()
}

async function getAddLiquidityPrice_formula(assetId, amount, bInputCore = true, nodeApi = bootNodeApi){
    let liquidity_price = 0
    const poolCoreBal = await getPoolCoreAssetBalance(assetId)
    const poolTokenBal = await getPoolAssetBalance(assetId)

    if (bInputCore){
        // input core amount
        liquidity_price = BN(poolTokenBal).times(amount).div(poolCoreBal).dp(0,1).toFixed()
    }else{
        // input token amount
        liquidity_price = BN(poolCoreBal).times(amount).div(poolTokenBal).dp(0,1).toFixed()
    }

    return liquidity_price
}

async function getRemoveLiquidityPrice(traderSeed, assetId, burdLiquidityAmount){
    const liquidity = new LiquidityBalance(traderSeed, assetId)
    await liquidity.getAll()

    // - formula: tokenWithdrawn = tokenPool * (amountBurned / totalLiquidity)
    const withdrawalTokenAmt = BN(burdLiquidityAmount).times(liquidity.poolTokenAsssetBal).div(liquidity.totalLiquidity).dp(0,1).toFixed()
    mlog.log('withdrawalTokenAmt =', withdrawalTokenAmt)
    
    // - formula: coreWithdrawn = corePool * (amountBurned / totalLiquidity)
    const withdrawalCoreAmt = BN(burdLiquidityAmount).times(liquidity.poolCoreAsssetBal).div(liquidity.totalLiquidity).dp(0,1).toFixed()
    mlog.log('withdrawalCoreAmt =', withdrawalCoreAmt)

    return {
        tokenAmount: withdrawalTokenAmt,
        coreAmount: withdrawalCoreAmt
    }
}

async function defaultFeeRate(nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    const feeRate = await spotX.api.query.cennzxSpot.defaultFeeRate()
    return parseInt(feeRate.toString())
}

/**
* Buy assetIdBought using assetIdSold
* @param assetIdSold The asset to pay with
* @param assetIdBought The asset to Buy
* @param amountBought amount to buy
* @param maxAmountSold maximum amount to pay
* Note: There will be an exchange fee rate (not the tx fee) in the calculation processs
*/
async function assetSwapOutput(traderSeed, assetIdSold, assetIdBought, amountBought, maxAmountSold, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    const tx = spotX.assetSwapOutput(assetIdSold, assetIdBought, amountBought, maxAmountSold)
    const txResult = await node.signAndSendTx(tx, traderSeed)
    return txResult
}

/**
 * Sell assetIdSold and gain assetIdBought as payback
 * @param assetIdSold The asset to sell
 * @param assetIdBought The asset to buy
 * @param amountSell amount of trade asset 1 to sell
 * @param minReceive Min trade asset 2 to receive from sale (output)
 */
async function assetSwapInput(traderSeed, assetIdSold, assetIdBought, amountSell, minReceive, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    const tx = spotX.assetSwapInput(assetIdSold, assetIdBought, amountSell, minReceive)
    const txResult = await node.signAndSendTx(tx, traderSeed)
    return txResult
}

/**
* Buy assetIdBought using assetIdSold and transfer amountBought to recipient
* @param traderSeed - trader account seed
* @param recipient - The address that receives the output asset
* @param assetIdSold The asset to sell
* @param assetIdBought The asset to buy
* @param amountBought amount of asset 2 to buy
* @param maxAmountSold maximum amount of asset allowed to sell
*/
async function assetTransferOutput(traderSeed, recipient, assetIdSold, assetIdBought, amountBought, maxAmountSold, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    const tx = spotX.assetTransferOutput(node.getAddressFromSeed(recipient) , assetIdSold, assetIdBought, amountBought, maxAmountSold)
    const txResult = await node.signAndSendTx(tx, traderSeed)
    return txResult
}

/**
 * Sell assetIdSold, gain assetIdBought as payback then transfer to recipient
 * @param recipient - The address that receives the output asset
 * @param assetIdSold The asset to sell
 * @param assetIdBought The asset to buy
 * @param amountSell amount of trade asset to sell
 * @param minReceive Min core asset to receive from sale (output)
 */
async function assetTransferInput(traderSeed, recipient, assetIdSold, assetIdBought, amountSell, minReceive, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    const tx = spotX.assetTransferInput(node.getAddressFromSeed(recipient) , assetIdSold, assetIdBought, amountSell, minReceive)
    const txResult = await node.signAndSendTx(tx, traderSeed)
    return txResult
}

// query the price to buy amountBought asset
async function getOutputPrice(assetIdSold, assetIdBought, amountBought, nodeApi = bootNodeApi){
    if (assetIdSold == assetIdBought){
        return amountBought.toString()
    }
    const spotX = await initSpotX(nodeApi)
    const price = await spotX.getOutputPrice(assetIdSold, assetIdBought, amountBought)
    return price.toString()
}

// query the price to sell asset of assetIdSold
async function getInputPrice(assetIdSold, assetIdBought, amountSold, nodeApi = bootNodeApi){
    if (assetIdSold == assetIdBought){
        return amountSold.toString()
    }
    const spotX = await initSpotX(nodeApi)
    const price = await spotX.getInputPrice(assetIdSold, assetIdBought, amountSold)
    return price.toString()
}

async function getCoreAssetId(nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    return (await spotX.getCoreAssetId()).toString();
}

async function getTotalLiquidity(assetId, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    const val = await spotX.getTotalLiquidity(assetId)
    return val.toString();
}

async function getLiquidityBalance(traderSeed, assetId, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    const val = await spotX.getLiquidityBalance(assetId, node.getAddressFromSeed(traderSeed))
    return val.toString()
}

async function getExchangeAddress( assetId, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    const address = await spotX.api.derive.cennzxSpot.exchangeAddress(assetId)
    return address.toString()
}

async function getPoolAssetBalance(assetId, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    const val = await spotX.getPoolAssetBalance(assetId)
    return val.toString()
}

async function getPoolCoreAssetBalance(assetId, nodeApi = bootNodeApi){
    const spotX = await initSpotX(nodeApi)
    const val = await spotX.getPoolCoreAssetBalance(assetId)
    return val.toString()
}

async function getFormulaInputPrice(assetIdSell, assetIdBuy, amountSell){
    const coreAssetId = await getCoreAssetId()
    let assetId = null
    const feeRate = BN((await defaultFeeRate()).toString()).div('1000000')
    let poolAssetSellBal = 0
    let poolAssetBuyBal = 0

    if (assetIdSell != coreAssetId && assetIdBuy != coreAssetId){
        const token1_to_core_price = await getFormulaInputPrice(assetIdSell, coreAssetId, amountSell)
        const core_to_token2_price = await getFormulaInputPrice(coreAssetId, assetIdBuy, token1_to_core_price)
        return core_to_token2_price
    }
    else if (assetIdSell != coreAssetId){
        assetId = assetIdSell
        poolAssetSellBal = await getPoolAssetBalance(assetId)
        poolAssetBuyBal = await getPoolCoreAssetBalance(assetId)
    }
    else{
        assetId = assetIdBuy
        poolAssetSellBal = await getPoolCoreAssetBalance(assetId)
        poolAssetBuyBal = await getPoolAssetBalance(assetId)
    }

    // calcualte with formula
    const actualAmountSell = BN(amountSell).div(BN(feeRate).plus(1)).dp(0,1).toFixed() // remove the fee first
    let inputPrice = BN(poolAssetBuyBal).times(actualAmountSell).div(
        BN(poolAssetSellBal).plus(actualAmountSell)
    ).dp(0,1).toFixed()   // remove decimals

    if ( inputPrice == 'NaN' ){
        inputPrice = '0'
    }

    return inputPrice   
}

async function getFormulaOutputPrice(assetIdSell, assetIdBuy, amountBuy){

    const coreAssetId = await getCoreAssetId()
    let assetId = null
    const feeRate = BN((await defaultFeeRate()).toString()).div('1000000')
    let poolAssetSellBal = 0
    let poolAssetBuyBal = 0

    if (assetIdSell != coreAssetId && assetIdBuy != coreAssetId){
        const core_to_token2_price = await getFormulaOutputPrice(coreAssetId, assetIdBuy, amountBuy)
        const token1_to_core_price = await getFormulaOutputPrice(assetIdSell, coreAssetId, core_to_token2_price)
        return token1_to_core_price
    }
    else if (assetIdSell != coreAssetId){
        assetId = assetIdSell
        poolAssetSellBal = await getPoolAssetBalance(assetId)
        poolAssetBuyBal = await getPoolCoreAssetBalance(assetId)
    }
    else{
        assetId = assetIdBuy
        poolAssetSellBal = await getPoolCoreAssetBalance(assetId)
        poolAssetBuyBal = await getPoolAssetBalance(assetId)
    }

    // calcualte with formula
    let outputPrice = BN(poolAssetSellBal).times(amountBuy).times(BN(feeRate).plus(1)).div(
        BN(poolAssetBuyBal).minus(amountBuy)
    ).plus(1).dp(0,1).toFixed()   // round up

    if ( outputPrice == 'NaN' ){
        outputPrice = '0'
    }

    return outputPrice    
}

module.exports.getCoreAssetId = getCoreAssetId
module.exports.getTotalLiquidity = getTotalLiquidity 
module.exports.getLiquidityBalance = getLiquidityBalance 
module.exports.getExchangeAddress = getExchangeAddress 
module.exports.checkMethod = checkMethod
module.exports.assetSwapOutput = assetSwapOutput
module.exports.assetSwapInput = assetSwapInput
module.exports.assetTransferInput = assetTransferInput
module.exports.assetTransferOutput = assetTransferOutput
module.exports.getInputPrice = getInputPrice
module.exports.getOutputPrice = getOutputPrice
module.exports.MethodParameter = MethodParameter
module.exports.LiquidityBalance = LiquidityBalance
module.exports.SpotXBalance = SpotXBalance
module.exports.getFormulaInputPrice = getFormulaInputPrice
module.exports.getFormulaOutputPrice = getFormulaOutputPrice
module.exports.getPoolAssetBalance = getPoolAssetBalance
module.exports.getPoolCoreAssetBalance = getPoolCoreAssetBalance
module.exports.addLiquidityAndCheck = addLiquidityAndCheck
module.exports.removeLiquidityAndCheck = removeLiquidityAndCheck
module.exports.getRemoveLiquidityPrice = getRemoveLiquidityPrice
module.exports.getAddLiquidityPrice = getAddLiquidityPrice
module.exports.getAddLiquidityPrice_formula = getAddLiquidityPrice_formula