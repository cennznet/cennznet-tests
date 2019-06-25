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

const assert = require('assert')
const { transfer, queryFreeBalance, topupTestAccount } = require('../../api/node')
const { CURRENCY } = require('../../api/definition')
const BN = require('bignumber.js')


describe('Transfer Token test suite:', function () {
    
    before(async function(){
        // await topupTestAccount()    // only for remote test
    })

    it('Transfer staking token', async function() {

        const fromSeed = 'Bob'
        const toSeed = 'James'
        const transAmt = 1000
        const assetId = CURRENCY.STAKE

        // get bal before tx
        const beforeTx_stake = await queryFreeBalance(toSeed, CURRENCY.STAKE)
        const beforeTx_spend = await queryFreeBalance(toSeed, CURRENCY.SPEND)

        // transfer
        await transfer(fromSeed, toSeed, transAmt, assetId)

        // get bal after tx
        const afterTx_stake = await queryFreeBalance(toSeed, CURRENCY.STAKE)
        const afterTx_spend = await queryFreeBalance(toSeed, CURRENCY.SPEND)

        assert.equal(afterTx_stake, BN(beforeTx_stake).plus(transAmt).toFixed(), `Payee's balance is wrong.`)
        assert.equal(afterTx_spend, beforeTx_spend, `Spending token balance is wrong.c`)

    });

    it('Transfer spending token', async function() {

        const fromSeed = 'Bob'
        const toSeed = 'James'
        const transAmt = 1000
        const assetId = CURRENCY.SPEND

        // get bal before tx
        let beforeTx_stake = await queryFreeBalance(toSeed, CURRENCY.STAKE)
        let beforeTx_spend = await queryFreeBalance(toSeed, CURRENCY.SPEND)

        // transfer
        await transfer(fromSeed, toSeed, transAmt, assetId)

        // get bal after tx
        let afterTx_stake = await queryFreeBalance(toSeed, CURRENCY.STAKE)
        let afterTx_spend = await queryFreeBalance(toSeed, CURRENCY.SPEND)

        assert.equal(afterTx_spend,  
                    BN(beforeTx_spend).plus(transAmt).toFixed(), 
                    `Payee's balance is wrong`)
        assert.equal(afterTx_stake, beforeTx_stake, `Staking token balance is wrong.`)
    });

});