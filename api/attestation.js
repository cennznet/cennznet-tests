const { bootNodeApi } = require('./websocket')
const { getAccount, setApiSigner, getNonce } = require('./node')
const { GenericAsset } = require('cennznet-generic-asset');
const { AssetId } = require('cennznet-runtime-types');
const { bnToHex } = require('@polkadot/util');

module.exports.setClaim = async function(issuer, holder, topic, value, nodeApi = bootNodeApi){ // issuer, holder : KeyringPair type
    // get api
    const api = await nodeApi.getApi()

    // get valid nonce
    const nonce = await getNonce(issuer.address());

    // set a claim
    const txResult = await new Promise(async (resolve, reject) => {
        const trans = api.tx.attestation.setClaim(holder.address(), topic, value)
        const txLen = trans.sign(issuer, nonce).encodedLength
        // console.log('len =', txLen)
        await trans.send(({ events = [], status, type }) => {
            if (type == 'Finalised') {
                const _hash = status.raw.toString() // get hash
                const result = {hash: _hash, txLength: txLen}
                resolve(result)
            }
        }).catch((error) => {
            reject(error)
        });
    });

    return txResult
}

module.exports.removeClaim = async function(issuer, holder, topic, nodeApi = bootNodeApi){
    // get api
    const api = await nodeApi.getApi()

    // get valid nonce
    const nonce = await getNonce(issuer.address());

    // set a claim
    const txResult = await new Promise(async (resolve, reject) => {
        const trans = api.tx.attestation.removeClaim(holder.address(), topic)
        const txLen = trans.sign(issuer, nonce).encodedLength
        // console.log('len =', txLen)
        await trans.send(({ events = [], status, type }) => {
            if (type == 'Finalised') {
                const _hash = status.raw.toString() // get hash
                const result = {hash: _hash, txLength: txLen}
                resolve(result)
            }
        }).catch((error) => {
            reject(error)
        });
    });

    return txResult
}

module.exports.getClaim = async function(holderAddress, issuerAddress, topic, nodeApi = bootNodeApi) {
    let api = await nodeApi.getApi()
    let claim = await api.query.attestation.values([holderAddress, issuerAddress, topic]);
    return bnToHex(claim);
}