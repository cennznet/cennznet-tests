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
const { putCode, createContract, callContract } = require('../../api/contract')
const node = require('../../api/node')
const BigNumber = require('big-number')


const contractFilePath = __dirname + '/../../dependency/spin2win.wasm'
// const contractHash = '0xef55f2f51f83c5dea3dd0ba33f654d00ca3f62e93929e4c0225e396c310fd1b3'
const contractHash = '0xf7920e0110a280214c3f490f96cb1894761ac8fdbb7ebbc44cc9d8c46a78bbd4'
const issuerSeed = 'Bob'
const gasLimit = 10000
const endowment = 1001

describe('Smart Contract test suite:', function () {
    
    before(async function(){
        await node.topupTestAccount()    // only for remote test
    })

    it('Put a smart contract code (Spin2Win) onto chain', async function() {

        let _contractHash= ''

        // put the contract code onto chain
        const result = await putCode(issuerSeed, gasLimit, contractFilePath)
        assert.equal( result.bSucc, true, `putCode() for smart contract failed.[MSG : ${result.message}]`)

        // get the contract hash
        result.events.forEach(({ phase, event: { data, method, section } }) => {
            if (method == 'CodeStored'){
                _contractHash = data[0].toString()   // data is an array
            }
        });
        assert.equal( _contractHash, contractHash, `Contract hash is not correct.[Expected: ${contractHash}, Actual: ${_contractHash}]`)

    });

    it('Initialize the deplyed contract using create()', async function() {
        // init contract
        const result = await createContract(issuerSeed, endowment, gasLimit, contractHash)
        // result.events.forEach(({ phase, event: { data, method, section } }) => {
        //     console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
        // });
        assert.equal( result.bSucc, true, `Create() the smart contract failed.[MSG : ${result.message}]`)
    });

    it.skip('Call spin2win contract to transfer asset', async function() {

        const destSeed = 'James'
        const transAmt = 10000
        const gasLimit = 50000

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
