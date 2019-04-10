
"use strict";

const assert = require('assert')
const { transfer, queryFreeBalance, topupTestAccount } = require('../../api/node')
const { CURRENCY } = require('../../api/definition')


describe('Transfer Token test suite:', function () {
    
    before(async function(){
        await topupTestAccount()    // only for remote test
    })

    it('Transfer staking token', async function() {

        const fromSeed = 'Bob'
        const toSeed = 'James'
        const transAmt = 1000
        const assetId = CURRENCY.STAKE

        // get bal before tx
        const beforeTx_cennz = await queryFreeBalance(toSeed, CURRENCY.STAKE)
        const beforeTx_spend = await queryFreeBalance(toSeed, CURRENCY.SPEND)

        // transfer
        await transfer(fromSeed, toSeed, transAmt, assetId)

        // get bal after tx
        const afterTx_cennz = await queryFreeBalance(toSeed, CURRENCY.STAKE)
        const afterTx_spend = await queryFreeBalance(toSeed, CURRENCY.SPEND)

        assert( (afterTx_cennz - beforeTx_cennz) == transAmt, 
                `Transfer tx (${fromSeed} -> amount: ${transAmt}, asset id:${assetId} -> ${toSeed}) failed. Payee's balance changed from [${beforeTx_cennz}] to [${afterTx_cennz}]`)
        assert( beforeTx_spend == afterTx_spend, 
                `Spending token changed from ${beforeTx_spend} to ${afterTx_spend}`)

    });

    it('Transfer spending token', async function() {

        const fromSeed = 'Bob'
        const toSeed = 'James'
        const transAmt = 1000
        const assetId = CURRENCY.SPEND

        // get bal before tx
        let beforeTx_cennz = await queryFreeBalance(toSeed, CURRENCY.STAKE)
        let beforeTx_spend = await queryFreeBalance(toSeed, CURRENCY.SPEND)

        // transfer
        await transfer(fromSeed, toSeed, transAmt, assetId)

        // get bal after tx
        let afterTx_cennz = await queryFreeBalance(toSeed, CURRENCY.STAKE)
        let afterTx_spend = await queryFreeBalance(toSeed, CURRENCY.SPEND)

        assert( (afterTx_spend - beforeTx_spend) == transAmt, 
                `Transfer tx (${fromSeed} -> amount: ${transAmt}, asset id:${assetId} -> ${toSeed}) failed. Payee's balance changed from [${afterTx_spend}] to [${beforeTx_spend}]`)
        assert( beforeTx_cennz == afterTx_cennz, `Spending token changed from ${beforeTx_cennz} to ${afterTx_cennz}`)
    });

});