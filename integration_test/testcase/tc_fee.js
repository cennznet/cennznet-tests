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
const { calulateTxFee, queryTxFee } = require('../../api/fee')
const BigNumber = require('big-number');
const { CURRENCY } = require('../../api/definition')


describe('Fee test suite', function () {

    before(async function(){
        await topupTestAccount()    // only for remote test
    })

    it("Transfer Fee formula check", async function() {
        // formula: transferFee + baseFee + byteFee * byteLength
        
        const fromSeed = 'Bob'
        const toSeed = 'James'
        const transAmt = 1000
        const assetId = CURRENCY.STAKE

        // transfer and get fee
        const txResult = await transfer(fromSeed, toSeed, transAmt, assetId)
        const fee_cal = await calulateTxFee(txResult.byteLength)                    // calculated fee
        // const fee_query = await queryTxFee(txResult.blockHash, txResult.txHash)     // queried fee

        assert.equal( txResult.txFee, fee_cal, `Transfer fee is wrong.`)
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
        const expectFee = txResult.txFee //await queryTxFee(txResult.blockHash, txResult.txHash)

        // get bal after tx
        const afterTx_cennz = await queryFreeBalance(fromSeed, CURRENCY.STAKE)
        const afterTx_spend = await queryFreeBalance(fromSeed, CURRENCY.SPEND)

        assert.notEqual(expectFee, 0, `Transaction fee is 0.`)
        assert.equal( 
            BigNumber(afterTx_cennz).toString(),
            BigNumber(beforeTx_cennz).minus(transAmt).toString(), 
            `Sender's staking token balance is worng.`)
        // check spending token balance
        assert.equal( 
            BigNumber(afterTx_spend).toString(), 
            BigNumber(beforeTx_spend).minus(expectFee).toString(),
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
        const expectFee = txResult.txFee // await queryTxFee(txResult.blockHash, txResult.txHash)

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
    });

    it.skip('TODO: Fee for removing a claim', async function() {
    });

    it.skip('TODO: Fee for creating new token', async function() {
    });
});