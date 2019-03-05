"use strict";

const assert = require('assert')
const {transfer, queryFreeBalance, CURRENCY} = require('../../api/node')
const {calulateTxFee, queryTxFee} = require('../../api/fee')
const BigNumber = require('big-number');


describe('Fee test cases...', function () {

    it(`Transfer Fee = transferFee + baseFee + ( byteFee * byteLength )`, async function() {
        this.timeout(60000)

        const fromSeed = 'Bob'
        const toAddress = '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ'
        const transAmt = 1000
        const assetId = CURRENCY.STAKE

        // transfer and get fee
        const txResult = await transfer(fromSeed, toAddress, transAmt, assetId)
        const fee_cal = await calulateTxFee(txResult.byteLength)                    // calculated fee
        const fee_query = await queryTxFee(txResult.blockHash, txResult.txHash)     // queried fee

        assert( fee_cal == fee_query, `Transfer fee [${fee_query}] did not equal to expected fee [${fee_cal}].`)
    });

    it('Fee of transferring staking token', async function() {
        this.timeout(60000)

        const fromSeed = 'Bob'
        const toAddress = '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ'
        const transAmt = 1000
        const assetId = CURRENCY.STAKE
        
        // get bal before tx
        const beforeTx_cennz = await queryFreeBalance(fromSeed, CURRENCY.STAKE)
        const beforeTx_spend = await queryFreeBalance(fromSeed, CURRENCY.SPEND)

        // transfer
        const txResult = await transfer(fromSeed, toAddress, transAmt, assetId)
        const expectFee = await queryTxFee(txResult.blockHash, txResult.txHash)

        // get bal after tx
        const afterTx_cennz = await queryFreeBalance(fromSeed, CURRENCY.STAKE)
        const afterTx_spend = await queryFreeBalance(fromSeed, CURRENCY.SPEND)
        const currFee = BigNumber(beforeTx_spend).minus(afterTx_spend).toString()

        assert( BigNumber(beforeTx_cennz).minus(afterTx_cennz) == transAmt, 
                `Transfer tx (${fromSeed} -> amount: ${transAmt}, asset id:${assetId} -> ${toAddress}) failed. Payee's balance changed from [${beforeTx_cennz}] to [${afterTx_cennz}]`)
        assert( currFee == expectFee, `Current fee [${currFee}] did not equal to expected fee [${expectFee}].`)
    });

    it('Fee of transferring spending token', async function() {
        this.timeout(60000)

        const fromSeed = 'Bob'
        const toAddress = '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ'
        const transAmt = 1000
        const assetId = CURRENCY.SPEND

        // get bal before tx
        const beforeTx_cennz = await queryFreeBalance(fromSeed, CURRENCY.STAKE)
        const beforeTx_spend = await queryFreeBalance(fromSeed, CURRENCY.SPEND)

        // transfer
        const txResult = await transfer(fromSeed, toAddress, transAmt, assetId)
        const expectFee = await queryTxFee(txResult.blockHash, txResult.txHash)

        // get bal after tx
        const afterTx_cennz = await queryFreeBalance(fromSeed, CURRENCY.STAKE)
        const afterTx_spend = await queryFreeBalance(fromSeed, CURRENCY.SPEND)

        const difference = BigNumber(beforeTx_spend).minus(afterTx_spend)
        assert( beforeTx_cennz == afterTx_cennz, `Staking token changed from ${beforeTx_cennz} to ${afterTx_cennz}. Should be the same.` )
        assert( difference == expectFee + transAmt, `Spending balance is wrong. Changed [${difference}], but expected value is [${expectFee + transAmt}].`)
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