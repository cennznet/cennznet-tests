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
// const { bootNodeApi } = require('../../api/websocket')
const { getAccount, topupTestAccount } = require('../../api/node')
const { setClaim, getClaim, removeClaim } = require('../../api/attestation')

// value to be claimed
const value = '0xa870ab713c422c58f565d7a560198804';
// const sparkAddress = '0xd6158cf83d045bd121f6122cafccffef';

// topic
const topic = 'KYC'

// holder
var holder = null
// issuer
var issuer = null

describe('Attestation test suite', function () {

    before(async function () {
        await topupTestAccount()    // only for remote test

        // set Alice as the holder
        holder = getAccount('Alice')
        
        // set Bob as the issuer
        issuer = getAccount('Bob')
    })

    it('Set a new claim and retrieve it', async function () {
        this.timeout(30000)

        // set a claim
        const txResult = await setClaim(issuer, holder, topic, value)
        
        // check the result
        assert(txResult.txHash.toString().length == 66, `SetClaim has not been finalised. (result = ${txResult.toString()})`)

        // query the value
        const claimValue = await getClaim(holder.address(), issuer.address(), topic)

        // remove '0x' and check if the retrieved value contains the expected value
        assert(claimValue.toString().indexOf(value.slice(2)) > 0, `The retrieved value(${claimValue}) is not the expected one(${value}).`)
    });

    it('Remove an existing claim and check if it is removed', async function () {
        this.timeout(30000)

        // query the value before remove
        const claimValueBeforeRemove = await getClaim(holder.address(), issuer.address(), topic)
        // remove '0x' and check if the retrieved value contains the expected value
        assert(claimValueBeforeRemove.toString().indexOf(value.slice(2)) > 0, `The retrieved value(${claimValueBeforeRemove}) is not the expected one(${value}).`)

        // remove the claim
        const txResult = await removeClaim(issuer, holder, topic)

        // check the result
        assert(txResult.txHash.toString().length == 66, `SetClaim has not been finalised. (result = ${txResult.toString()})`) 

        // query the value after remove
        const claimValueAfterRemove = await getClaim(holder.address(), issuer.address(), topic)

        // check if the retrieved value is 0
        assert( parseInt(claimValueAfterRemove) == 0, `The retrieved value(${claimValueAfterRemove}) is not removed.`)

    });

})

