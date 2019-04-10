"use strict";

const assert = require('assert')
const { transfer, queryFreeBalance, topupTestAccount } = require('../../api/node')
const { calulateTxFee, queryTxFee } = require('../../api/fee')
const BigNumber = require('big-number');
const { CURRENCY } = require('../../api/definition')


describe('Fee test suite', function () {

    before(async function(){
        await topupTestAccount()    // only for remote test
    })

    it.skip("TODO: Transfer Fee formula check", async function() {
        // formula: transferFee + baseFee + byteFee * byteLength
        this.timeout(60000)
        
        const fromSeed = 'Bob'
        const toSeed = 'James'
        const transAmt = 1000
        const assetId = CURRENCY.STAKE

        // transfer and get fee
        const txResult = await transfer(fromSeed, toSeed, transAmt, assetId)
        const fee_cal = await calulateTxFee(txResult.byteLength)                    // calculated fee
        const fee_query = await queryTxFee(txResult.blockHash, txResult.txHash)     // queried fee

        assert( fee_cal == fee_query, `Transfer fee [${fee_query}] did not equal to expected fee [${fee_cal}].`)
    });


    it('Fee of transferring staking token', async function() {
        
        const fromSeed = 'Bob'
        const toSeed = 'James'
        const transAmt = 1000
        const assetId = CURRENCY.STAKE
        
        // get bal before tx
        const beforeTx_cennz = await queryFreeBalance(fromSeed, CURRENCY.STAKE)
        const beforeTx_spend = await queryFreeBalance(fromSeed, CURRENCY.SPEND)

        // transfer
        const txResult = await transfer(fromSeed, toSeed, transAmt, assetId)
        const expectFee = await queryTxFee(txResult.blockHash, txResult.txHash)

        // get bal after tx
        const afterTx_cennz = await queryFreeBalance(fromSeed, CURRENCY.STAKE)
        const afterTx_spend = await queryFreeBalance(fromSeed, CURRENCY.SPEND)
        const currFee = BigNumber(beforeTx_spend).minus(afterTx_spend).toString()

        assert.notEqual(expectFee, 0, `Transaction fee is 0.`)
        assert.equal( 
            BigNumber(afterTx_cennz).toString(),
            BigNumber(beforeTx_cennz).minus(transAmt).toString(), 
            `Sender's staking token balance is worng.`)
        // check spending token balance
        assert.equal( 
            BigNumber(afterTx_spend).toString(), 
            BigNumber(beforeTx_spend).minus(expectFee).toString()
            `Sender's spending token balance is wrong.`)
    });

    it('Fee of transferring spending token', async function() {

        const fromSeed = 'Bob'
        const toSeed = 'James'
        const transAmt = 1000
        const assetId = CURRENCY.SPEND

        // get bal before tx
        const beforeTx_cennz = await queryFreeBalance(fromSeed, CURRENCY.STAKE)
        const beforeTx_spend = await queryFreeBalance(fromSeed, CURRENCY.SPEND)

        // transfer
        const txResult = await transfer(fromSeed, toSeed, transAmt, assetId)
        const expectFee = await queryTxFee(txResult.blockHash, txResult.txHash)

        // get bal after tx
        const afterTx_cennz = await queryFreeBalance(fromSeed, CURRENCY.STAKE)
        const afterTx_spend = await queryFreeBalance(fromSeed, CURRENCY.SPEND)

        // check staking token  balance
        assert.equal( afterTx_cennz, beforeTx_cennz , `Staking token balance is wrong.` )

        // check spending token balance
        assert.equal( 
            BigNumber(afterTx_spend).toString(),
            BigNumber(beforeTx_spend).minus(transAmt).minus(expectFee).toString(),
            `Spending token balance is wrong.`)
    });

    it.skip('TODO: Fee for setting a new claim', async function() {
        this.timeout(60000)
    });

    it.skip('TODO: Fee for removing a claim', async function() {
        this.timeout(60000)
    });

    it.skip('TODO: Fee for creating new token', async function() {
        this.timeout(60000)
    });
});