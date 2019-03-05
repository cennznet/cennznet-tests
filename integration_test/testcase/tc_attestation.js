
"use strict";

const assert = require('assert')
const { bootNodeApi } = require('../../api/websocket')
const { getAccount, getNonce } = require('../../api/node')
const { bnToHex } = require('@polkadot/util');
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

describe('Attestation test cases...', function () {

    before(async function () {
        await bootNodeApi.init(10)

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
        assert(txResult.hash.toString().length == 66, `SetClaim has not been finalised. (result = ${txResult})`)

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
        assert(txResult.hash.toString().length == 66, `SetClaim has not been finalised. (result = ${txResult})`) 

        // query the value after remove
        const claimValueAfterRemove = await getClaim(holder.address(), issuer.address(), topic)

        // check if the retrieved value is 0
        assert( parseInt(claimValueAfterRemove) == 0, `The retrieved value(${claimValueAfterRemove}) is not removed.`)

    });

})

