
"use strict";

const assert = require('assert')
const { bootNodeApi } = require('../../api/websocket')
const { getAccount, getNonce } = require('../../api/node')
const { bnToHex } = require('@polkadot/util');


// value to be claimed
const value = '0xa870ab713c422c58f565d7a560198804';
// const sparkAddress = '0xd6158cf83d045bd121f6122cafccffef';

// topic
const topic = 'KYC'

// holder
var holder = null
// issuer
var issuer = null

async function getClaim(holderAddress, issuerAddress, topic) {
    let api = await bootNodeApi.getApi()
    let claim = await api.query.attestation.values([holderAddress, issuerAddress, topic]);
    return bnToHex(claim);
}

describe('Attestation test cases...', function () {

    before(async function () {
        await bootNodeApi.init(10)

        // set Alice as the holder
        holder = getAccount('Alice')
        
        // set Bob as the issuer
        issuer = getAccount('Bob')
    })

    after(function () {
        bootNodeApi.close()
    })

    it('Set a new claim and retrieve it', async function () {
        this.timeout(30000)

        // get api
        const api = await bootNodeApi.getApi()

        // get valid nonce
        const nonce = await getNonce(issuer.address());

        // set a claim
        const hash = await new Promise(async (resolve,reject) => {
            await api.tx.attestation.setClaim(holder.address(), topic, value)
            .sign(issuer, nonce)
            .send( ({ events = [], status, type }) => {
                if (type == 'Finalised') {
                    let hash = status.raw.toString() // get hash
                    resolve(hash) 
                }
            }).catch((error) => {
                // console.log('Error =', error);
                reject(error)
                // done();
            });
        });
        
        // check the result
        assert(hash.toString().length == 66, `SetClaim has not been finalised. (result = ${hash})`)

        // query the value
        const claimValue = await getClaim(holder.address(), issuer.address(), topic)

        // remove '0x' and check if the retrieved value contains the expected value
        assert(claimValue.toString().indexOf(value.slice(2)) > 0, `The retrieved value(${claimValue}) is not the expected one(${value}).`)
    });

    it('Remove an existing claim and check if it is removed', async function () {
        this.timeout(30000)

        // get api
        const api = await bootNodeApi.getApi()

        // get valid nonce
        const nonce = await getNonce(issuer.address());

        // query the value before remove
        const claimValueBeforeRemove = await getClaim(holder.address(), issuer.address(), topic)
        // remove '0x' and check if the retrieved value contains the expected value
        assert(claimValueBeforeRemove.toString().indexOf(value.slice(2)) > 0, `The retrieved value(${claimValueBeforeRemove}) is not the expected one(${value}).`)

        // remove the claim
        const hash = await new Promise(async (resolve,reject) => {
            await api.tx.attestation.removeClaim(holder.address(), topic)
            .sign(issuer, nonce)
            .send( ({ events = [], status, type }) => {
                if (type == 'Finalised') {
                    let hash = status.raw.toString() // get hash
                    resolve(hash) 
                }
            }).catch((error) => {
                reject(error)
            });
        });

        // check the result
        assert(hash.toString().length == 66, `SetClaim has not been finalised. (result = ${hash})`) 

        // query the value after remove
        const claimValueAfterRemove = await getClaim(holder.address(), issuer.address(), topic)

        // check if the retrieved value is 0
        assert( parseInt(claimValueAfterRemove) == 0, `The retrieved value(${claimValueAfterRemove}) is not removed.`)

    });
})

