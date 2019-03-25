
"use strict";

const { bootNodeApi } = require('./websocket');
const { TxResult, CURRENCY } = require('./definition');
const { stringToU8a, hexToBn, Keyring } = require('@cennznet/util');
const { SimpleKeyring, Wallet } = require('@cennznet/wallet')
const { GenericAsset}  = require('@cennznet/generic-asset')
const { queryTxFee, queryCurrentTxFee } = require('./fee')


async function transfer(fromSeed, toAddress, amount, assetId = CURRENCY.STAKE, nodeApi = bootNodeApi) {
    // console.log('api = ', nodeApi._api)
    const api = await nodeApi.getApi()

    await setApiSigner(api, fromSeed)

    const amountBN = hexToBn(amount.toString(16))

    // convert to address if input is a seed
    const _toAddress = getAddressFromSeed(toAddress)

    const trans = api.tx.genericAsset.transfer(assetId, _toAddress, amountBN)

    const txResult = await signAndSendTx(trans, fromSeed)

    if (txResult.bSucc){
        txResult.txFee = await queryTxFee(txResult.blockHash, txResult.txHash, nodeApi)
    }

    return txResult
}

async function signAndSendTx(transaction, seedOrAccount){
    const txResult = new TxResult()

    let account = null

    // seed is String, account is Object
    typeof(seedOrAccount) == 'string' ? account = getAccount(seedOrAccount) : account = seedOrAccount
    
    // get valid nonce
    const nonce = await getNonce(account.address());

    // Send and wait nonce changed
    await new Promise(async (resolve,reject) => {
        // get tx hash and length (byte)
        const signedTx = transaction.sign(account, nonce)
        txResult.txHash = signedTx.hash.toString()
        txResult.byteLength = signedTx.encodedLength
        // send tx
        await transaction.send( async (r) => {
            if ( r.type == 'Finalised' ){
                // get block hash
                txResult.blockHash = r.status.asFinalised.toHex()
                // get extrinsic id
                txResult.extrinsicIndex = r.events[0].phase.asApplyExtrinsic.toString()
                // set tx result symbol
                txResult.bSucc = true
                // get all events
                txResult.events = r.events
                // get tx fee
                txResult.txFee = await queryTxFee(txResult.blockHash, txResult.extrinsicIndex)

                // check if the extrinsic succeeded
                r.events.forEach(({ phase, event: { data, method, section } }) => {
                    if ( method == 'ExtrinsicFailed'){
                        txResult.bSucc = false
                        txResult.message = `Transaction failed: ${section}.${method}`
                    }
                });

                resolve(true); 
            }
            else if (r.type == 'Invalid'){
                txResult.bSucc = false
                txResult.events = r.events
                txResult.message = `Transaction type = ${r.type}`
                resolve(true);
            }
        }).catch((error) => {
            reject(error);
        });
    });

    return txResult
}

function getAccount(seed){
    const _seed = seed.padEnd(32, ' ');
    const keyring = new Keyring();
    const account = keyring.addFromSeed(stringToU8a(_seed));
    return account
}

// retrive nonce and conver to integer
async function getNonce(address, nodeApi = bootNodeApi){
    let api = await nodeApi.getApi()
    let nonce = await api.query.system.accountNonce( address );
    return parseInt(nonce.toString())   // convert to int
}

function getAddressFromSeed(seed){
    let _address = null;

    // Operate different input: seed or address
    if ( seed.length == 48 ) {   // address
        _address = seed
    }
    else{   // seed
        const _seed = seed.padEnd(32, ' ');
        const keyring = new Keyring();
        const fromAccount = keyring.addFromSeed(stringToU8a(_seed));
        _address = fromAccount.address();
    }

    return _address
}

async function queryFreeBalance( address, assetId = CURRENCY.STAKE, nodeApi = bootNodeApi ) {    // assetId: 0 - CENNZ, 10 - SPEND

    // get balance via GenericAsset
    const api = await nodeApi.getApi()
    const ga = await GenericAsset.create(api);
    const balance = await ga.getFreeBalance(assetId, getAddressFromSeed(address))

    return balance.toString();
}

async function setApiSigner(api, signerSeed){ // signerSeed - string, like 'Alice'
    // create wallet
    const wallet = new Wallet();
    await wallet.createNewVault('a passphrase');
    const keyring = new SimpleKeyring();
    await keyring.addFromSeed(stringToU8a(signerSeed.padEnd(32, ' ')));
    await wallet.addKeyring(keyring);

    // set wallet as signer of api
    api.setSigner(wallet)

    return api
}


module.exports.setApiSigner = setApiSigner
module.exports.CURRENCY = CURRENCY
module.exports.transfer = transfer
module.exports.signAndSendTx = signAndSendTx
module.exports.queryFreeBalance = queryFreeBalance
module.exports.getAccount = getAccount
module.exports.getNonce = getNonce
module.exports.getAddressFromSeed = getAddressFromSeed

