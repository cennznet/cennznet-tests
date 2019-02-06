
"use strict";

const assert = require('assert')
const {bootNodeApi} = require('../api/websocket')
const {sendWaitConfirm, queryBal} = require('../api/bootNode')


describe('Boot Node test cases', function () {
    
    before(async function(){
        await bootNodeApi.init()
    })

    after(function(){
        bootNodeApi.close()
    })
    
    it('Send transfer transaction', async function() {
        this.timeout(60000)

        const fromSeed = 'Alice'
        const toAddress = '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ'
        const transAmt = 1000

        let balBeforeTx = await queryBal(toAddress)
        await sendWaitConfirm(fromSeed, toAddress, transAmt)
        let balAfterTx = await queryBal(toAddress)

        assert( (balAfterTx - balBeforeTx) == transAmt, `Transfer tx (${fromSeed} -> amount: ${transAmt} -> ${toAddress})failed. Payee's balance before and after tx are: [${balBeforeTx}],[${balAfterTx}]`)
    });



});