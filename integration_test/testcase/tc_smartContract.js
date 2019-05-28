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

const mlog = require('mocha-logger')
const assert = require('assert')
const { putCode, createContract, callContract } = require('../../api/contract')
const { CURRENCY } = require('../../api/definition')
const node = require('../../api/node')
const BigNumber = require('big-number')


const contractFilePath = __dirname + '/../../dependency/spin2win.wasm'
var contractHash = '' //'0x1adcb2e5becd80a4250534bd43e4f172a33ffcac5590e9777665677ebfc58285'
var issuerSeed = '' 
const gasLimit = '50000'
const endowment = '10000000000000000000'

describe('Smart Contract test suite:', function () {
    
    before(async function(){
        await node.topupTestAccount()    // only for remote test

        // create a random seed
        issuerSeed = 'issuer_' + Math.random().toString(36).substr(2)    
        
        mlog.log('issuerSeed =', issuerSeed)

        // top up the issuer account
        await node.transfer('Alice', issuerSeed, endowment + '0', CURRENCY.STAKE)
        await node.transfer('Alice', issuerSeed, endowment + '0', CURRENCY.SPEND)
    })

    it('Put a smart contract code (Spin2Win) onto chain', async function() {

        let _contractHash = ''

        // put the contract code onto chain
        const result = await putCode(issuerSeed, gasLimit, contractFilePath)
        assert.equal( result.bSucc, true, `putCode() for smart contract failed.[MSG : ${result.message}]`)

        // get the contract hash
        result.events.forEach(({ phase, event: { data, method, section } }) => {
            if (method == 'CodeStored'){
                _contractHash = data[0].toString()   // data is an array
            }
        });

        contractHash = _contractHash

        mlog.log('Get contractHash =', contractHash)

        assert.notEqual( _contractHash, '', `Contract hash is null.`)        
    });

    it('Initialize the deplyed contract using create()', async function() {
        // init contract
        const result = await createContract(issuerSeed, endowment, gasLimit, contractHash)
        // result.events.forEach(({ phase, event: { data, method, section } }) => {
        //     console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
        // });
        assert.equal( result.bSucc, true, `Create() the smart contract failed.[MSG : ${result.message}]`)
    });

    it('Call spin2win contract to transfer asset', async function() {

        const destSeed = 'James'
        const transAmt = 10000

        // check balance before tx
        const destSeedBal_beforeTx = await node.queryFreeBalance(destSeed, CURRENCY.SPEND)

        const txResult = await callContract(issuerSeed, destSeed, transAmt, gasLimit)
        assert.equal(txResult.bSucc, true, `Function callContract() failed.`)

        // check balance after tx
        const destSeedBal_afterTx = await node.queryFreeBalance(destSeed, CURRENCY.SPEND)

        assert.equal( 
            destSeedBal_afterTx, 
            BigNumber(destSeedBal_beforeTx).add(transAmt).toString(),
            `Destination seed ${destSeed} did not get transfer amount ${transAmt}`)
    });
});
