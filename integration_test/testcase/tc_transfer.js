
"use strict";

const assert = require('assert')
const {transfer, queryFreeBalance, CURRENCY} = require('../../api/node')


describe('Transfer Token test suite:', function () {
    
    it('Transfer staking token', async function() {
        //this.timeout(60000)
        this.timeout(60000)

        const fromSeed = 'Bob'
        const toAddress = '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ'
        const transAmt = 1000
        const assetId = CURRENCY.STAKE

        // get bal before tx
        let beforeTx_cennz = await queryFreeBalance(toAddress, CURRENCY.STAKE)
        let beforeTx_spend = await queryFreeBalance(toAddress, CURRENCY.SPEND)

        // transfer
        await transfer(fromSeed, toAddress, transAmt, assetId)

        // get bal after tx
        let afterTx_cennz = await queryFreeBalance(toAddress, CURRENCY.STAKE)
        let afterTx_spend = await queryFreeBalance(toAddress, CURRENCY.SPEND)

        assert( (afterTx_cennz - beforeTx_cennz) == transAmt, 
                `Transfer tx (${fromSeed} -> amount: ${transAmt}, asset id:${assetId} -> ${toAddress}) failed. Payee's balance changed from [${beforeTx_cennz}] to [${afterTx_cennz}]`)
        assert( beforeTx_spend == afterTx_spend, 
                `Spending token changed from ${beforeTx_spend} to ${afterTx_spend}`)

    });

    it('Transfer spending token', async function() {
        //this.timeout(60000)
        this.timeout(60000)

        const fromSeed = 'Bob'
        const toAddress = '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ'
        const transAmt = 1000
        const assetId = CURRENCY.SPEND

        // get bal before tx
        let beforeTx_cennz = await queryFreeBalance(toAddress, CURRENCY.STAKE)
        let beforeTx_spend = await queryFreeBalance(toAddress, CURRENCY.SPEND)

        // transfer
        await transfer(fromSeed, toAddress, transAmt, assetId)

        // get bal after tx
        let afterTx_cennz = await queryFreeBalance(toAddress, CURRENCY.STAKE)
        let afterTx_spend = await queryFreeBalance(toAddress, CURRENCY.SPEND)

        assert( (afterTx_spend - beforeTx_spend) == transAmt, 
                `Transfer tx (${fromSeed} -> amount: ${transAmt}, asset id:${assetId} -> ${toAddress}) failed. Payee's balance changed from [${afterTx_spend}] to [${beforeTx_spend}]`)
        assert( beforeTx_cennz == afterTx_cennz, `Spending token changed from ${beforeTx_cennz} to ${afterTx_cennz}`)
    });

});