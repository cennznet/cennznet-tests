"use strict";

const assert = require('assert')
const {bootNodeApi} = require('../../api/websocket')
const {transfer, queryFreeBalance, currency} = require('../../api/node')
const BigNumber = require('big-number');


describe('Fee test cases...', function () {
    
    before(async function(){
        await bootNodeApi.init()
    })

    after(function(){
        bootNodeApi.close()
    })

    // TODO: change config and check dynamic fee, also check if fee are moved to system account

    it('Fee of transferring staking token', async function() {
        this.timeout(60000)

        const fromSeed = 'Bob'
        const toAddress = '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ'
        const transAmt = 1000
        const assetId = currency.CENNZ
        const expectFee = 157   // TODO: calculate a real fee

        // get bal before tx
        const beforeTx_cennz = await queryFreeBalance(fromSeed, currency.CENNZ)
        const beforeTx_spend = await queryFreeBalance(fromSeed, currency.SPEND)

        // transfer
        await transfer(fromSeed, toAddress, transAmt, assetId)

        // get bal after tx
        const afterTx_cennz = await queryFreeBalance(fromSeed, currency.CENNZ)
        const afterTx_spend = await queryFreeBalance(fromSeed, currency.SPEND)
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
        const assetId = currency.SPEND
        const expectFee = 157   // TODO: calculate a real fee

        // get bal before tx
        const beforeTx_cennz = await queryFreeBalance(fromSeed, currency.CENNZ)
        const beforeTx_spend = await queryFreeBalance(fromSeed, currency.SPEND)

        // transfer
        await transfer(fromSeed, toAddress, transAmt, assetId)

        // get bal after tx
        const afterTx_cennz = await queryFreeBalance(fromSeed, currency.CENNZ)
        const afterTx_spend = await queryFreeBalance(fromSeed, currency.SPEND)

        const difference = BigNumber(beforeTx_spend).minus(afterTx_spend)
        assert( beforeTx_cennz == afterTx_cennz, `Staking token changed from ${beforeTx_cennz} to ${afterTx_cennz}. Should be the same.` )
        assert( difference == expectFee + transAmt, `Spending balance is wrong. Changed [${difference}], but expected value is [${expectFee + transAmt}].`)
    });
});