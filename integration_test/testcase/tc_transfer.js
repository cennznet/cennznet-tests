
"use strict";

const assert = require('assert')
const {bootNodeApi} = require('../../api/websocket')
const {transfer, queryFreeBalance, currency} = require('../../api/node')


describe('Transfer Token test cases...', function () {
    
    before(async function(){
        await bootNodeApi.init()
    })

    after(function(){
        bootNodeApi.close()
    })
    
    it('Transfer staking token', async function() {
        this.timeout(60000)

        const fromSeed = 'Bob'
        const toAddress = '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ'
        const transAmt = 1000
        const assetId = currency.CENNZ

        // get bal before tx
        let beforeTx_cennz = await queryFreeBalance(toAddress, currency.CENNZ)
        let beforeTx_spend = await queryFreeBalance(toAddress, currency.SPEND)

        // transfer
        await transfer(fromSeed, toAddress, transAmt, assetId)

        // get bal after tx
        let afterTx_cennz = await queryFreeBalance(toAddress, currency.CENNZ)
        let afterTx_spend = await queryFreeBalance(toAddress, currency.SPEND)

        assert( (afterTx_cennz - beforeTx_cennz) == transAmt, 
                `Transfer tx (${fromSeed} -> amount: ${transAmt}, asset id:${assetId} -> ${toAddress}) failed. Payee's balance changed from [${beforeTx_cennz}] to [${afterTx_cennz}]`)
        assert( beforeTx_spend == afterTx_spend, 
                `Spending token changed from ${beforeTx_spend} to ${afterTx_spend}`)

    });

    it('Transfer spending token', async function() {
        this.timeout(60000)

        const fromSeed = 'Bob'
        const toAddress = '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ'
        const transAmt = 1000
        const assetId = currency.SPEND

        // get bal before tx
        let beforeTx_cennz = await queryFreeBalance(toAddress, currency.CENNZ)
        let beforeTx_spend = await queryFreeBalance(toAddress, currency.SPEND)

        // transfer
        await transfer(fromSeed, toAddress, transAmt, assetId)

        // get bal after tx
        let afterTx_cennz = await queryFreeBalance(toAddress, currency.CENNZ)
        let afterTx_spend = await queryFreeBalance(toAddress, currency.SPEND)

        assert( (afterTx_spend - beforeTx_spend) == transAmt, 
                `Transfer tx (${fromSeed} -> amount: ${transAmt}, asset id:${assetId} -> ${toAddress}) failed. Payee's balance changed from [${afterTx_spend}] to [${beforeTx_spend}]`)
        assert( beforeTx_cennz == afterTx_cennz, `Spending token changed from ${beforeTx_cennz} to ${afterTx_cennz}`)
    });
});