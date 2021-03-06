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
const {GenericAsset} = require('@cennznet/crml-generic-asset')
const { bootNodeApi } = require('./websocket');
const { TxResult, CURRENCY, keypairCryptoType } = require('./definition');
const { SimpleKeyring, Wallet } = require('@cennznet/wallet')
const GA  = require('./ga')
const { queryTxFee } = require('./fee')
const BN = require('bignumber.js')
const block = require('./block')
const args = require('./args')
const util = require('./util')



async function transfer(fromSeed, toAddressOrSeed, amount, assetId = CURRENCY.STAKE, waitFinalisedFlag = true, nodeApi = bootNodeApi) {
    const ga = await GA.initGA(fromSeed, nodeApi)

    // convert to address if input is a seed
    const _toAddress = await getAddressFromSeed(toAddressOrSeed)

    const tx = ga.transfer(assetId, _toAddress, amount.toString())

    const txResult = await signAndSendTx(tx, fromSeed, -1, waitFinalisedFlag)

    return txResult
}

// transfer with manual nonce 
async function transferWithNonce(fromSeed, toAddressOrSeed, amount, nonce = -1, assetId = CURRENCY.STAKE, nodeApi = bootNodeApi) {
    // console.log('api = ', nodeApi._api)
    const api = await nodeApi.getApi()

    await setApiSigner(api, fromSeed)

    // convert to address if input is a seed
    const _toAddress = await getAddressFromSeed(toAddressOrSeed)

    const trans = api.tx.genericAsset.transfer(assetId, _toAddress, amount.toString())

    const txResult = await signAndSendTx(trans, fromSeed, nonce, false)

    if (txResult.bSucc){
        txResult.txFee = await queryTxFee(txResult.blockHash, txResult.txHash, nodeApi)
    }

    return txResult
}

async function signAndSendTx(transaction, seedOrAccount, nonce_in = -1, waitFinalised = true){
    const txResult = new TxResult()

    let account = null
    let nonce = nonce_in

    // seed is String, account is Object
    typeof(seedOrAccount) == 'string' ? account = getAccount(seedOrAccount) : account = seedOrAccount
    
    // if no nonce value, then get it
    if (nonce_in < 0){
        nonce = await getNonce(account.address);
    }
    
    // Send and wait nonce changed
    await new Promise(async (resolve,reject) => {
        // get tx hash and length (byte)
        const signedTx = transaction.sign(account, nonce)
        txResult.txHash = signedTx.hash.toString()
        
        txResult.byteLength = signedTx.encodedLength
        // send tx
        await transaction.send( async (r) => {
            // if donot wait, return straighaway
            if (waitFinalised != true){
                resolve(true); 
            }

            if (r.status.isFinalized == true && r.events != undefined){
                try{
                    // get block hash
                    txResult.blockHash = r.status.raw.toString()
                    // get extrinsic id
                    if (r.events[0] ==  undefined) 
                        console.log('undefined event. r =', r)

                    txResult.extrinsicIndex = r.events[0].phase.asApplyExtrinsic.toString()

                    // set tx result symbol
                    txResult.bSucc = true
                    // get all events
                    txResult.events = r.events
                    // get tx fee
                    txResult.txFee = await queryTxFee(txResult.blockHash, txResult.extrinsicIndex)
                   
                    // check if the extrinsic succeeded
                    // r.events.forEach(({ phase, event: { data, method, section } }) => {
                    //     if (method == 'ExtrinsicFailed') {
                    //         txResult.bSucc = false
                    //         txResult.message = `Transaction failed at block(${txResult.blockHash}): ${section}.${method}`
                    //         resolve(false)
                    //     }
                    // });

                    r.events.forEach((eachEvent) => {
                        // { phase, event: { data, method, section } } = eachEvent
                        if (eachEvent.event.method == 'ExtrinsicFailed') {
                            txResult.bSucc = false
                            txResult.message = `Transaction failed at block(${txResult.blockHash}): ${eachEvent.event.section}.${eachEvent.event.method}`
                            resolve(false)
                        }
                    });

                }
                catch(error){
                    txResult.bSucc = false
                    txResult.events = r.events
                    txResult.message = `Transaction got error = ${error.toString()}`
                    reject(error);
                }
                
                resolve(true); 
            }
            else if ('Invalid' == r.status.toString() || r.events == undefined){
                txResult.bSucc = false
                txResult.events = r.events
                txResult.message = `Transaction status = ${r.status.toString()}`
                resolve(true);
            }
        }).catch((error) => {
            reject(error);
        });
    });

    return txResult
}

function getAccount(seed, keyType = keypairCryptoType){  // Note: Should call 'await cryptoWaitReady()' first if api is not created.
    const seedUri = '//' + seed
    const simpleKeyring = new SimpleKeyring(); 
    const account = simpleKeyring.addFromUri( seedUri, {}, keyType );
    return account
}

// retrive nonce and conver to integer
async function getNonce(addressOrSeed, nodeApi = bootNodeApi){
    const api = await nodeApi.getApi()
    const address = getAddressFromSeed(addressOrSeed)
    const nonce = await api.query.system.accountNonce( address );
    return parseInt(nonce.toString())   // convert to int
}

function getAddressFromSeed(seed, keyType = keypairCryptoType){

    if ( seed == null || seed == undefined || seed == ''){
        return ''
    }

    let address = null;

    // Operate different input: seed or address
    if ( seed.length == 48 ) {   // address
        address = seed
    }
    else{   // seed
        address = getAccount(seed, keyType).address
    }

    return address
}

async function queryFreeBalance( seed, assetId = CURRENCY.STAKE, nodeApi = bootNodeApi ) {    // assetId: 0 - CENNZ, 10 - SPEND

    const ga = await GA.initGA(seed, nodeApi)
    const balance = await ga.getFreeBalance(assetId, await getAddressFromSeed(seed))

    return balance.toString();
}

async function waitBalanceChange(seed, assetId = CURRENCY.STAKE, nodeApi = bootNodeApi){
    const preBalance = await queryFreeBalance(seed, assetId, nodeApi)

    for (let i = 0; i < 300; i++){
        await util.sleep(1000)
        let currentBalance = await queryFreeBalance(seed, assetId, nodeApi)
        if (currentBalance != preBalance){
            break
        }
    }

    throw new Error('waitBalanceChange() timeout')
}

async function setApiSigner(api, signerSeed){ // signerSeed - string, like 'Alice'
    // create wallet
    const wallet = new Wallet(); 
    await wallet.createNewVault('a passphrase'); 
    const keyring = new SimpleKeyring(); 
    const seedUri = '//' + signerSeed
    keyring.addFromUri(seedUri)
    await wallet.addKeyring(keyring);

    // set wallet as signer of api
    api.setSigner(wallet)

    return api
}

async function getTransferFee(nodeApi = bootNodeApi){
    const api = await nodeApi.getApi()
    const ga = await GenericAsset.create(api);
    const transferFee = await ga.api.query.genericAsset.transferFee()
    return transferFee.toString()
}

// Topup account for the test on Rimu or Kauri node
async function topupTestAccount(){
    // local node donot need to topup
    const nodeServerWsIp = args.getDefaultWsIp()
    if ( nodeServerWsIp.indexOf('127.0.0.1') >= 0 ){
        return
    }

    mlog.log('Top up test account...')

    let txCnt = 0
    const transferFee = 10000 //BN(await getTransferFee())
    const fromSeed = 'Andrea'   // or change a wealthy account seed
    // topup spending and staking balance, topup: Alice, Bob, Charlie, Dave, Eve, Ferdie. These are endowed accounts in local node.
    const toSeedLst = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Ferdie'] 
    const amount = '5000000000000000000'
    let nonce = await getNonce(fromSeed)

    toSeedLst.forEach(async toSeed => {
        
        // get balances
        let stakeBal = await queryFreeBalance(toSeed, CURRENCY.STAKE)
        let spendBal = await queryFreeBalance(toSeed, CURRENCY.SPEND)

        // transfer staking token if needed
        if ( BN(stakeBal).div(transferFee).lt(100) ){
            await transferWithNonce( fromSeed, toSeed, amount, nonce++, CURRENCY.STAKE )   // transfer staking token
            txCnt ++
        }

        // transfer spending token if needed
        if ( BN(spendBal).div(transferFee).lt(100) ){
            await transferWithNonce( fromSeed, toSeed, amount, nonce++, CURRENCY.SPEND )   // transfer spending token
            txCnt ++
        }
    });

    // wait block change if there are transfer tx sent
    if ( txCnt > 0 ){
        await block.waitBlockCnt(1)
    }
}


/**
 * set genesis file for local test
 */
async function setNodeConfig(){

    const nodeServerWsIp = args.getDefaultWsIp()
    if ( nodeServerWsIp.indexOf('127.0.0.1') < 0 ){
        return
    }

    console.log('---- setNodeConfig')
    const api = await bootNodeApi.getApi()
    const adminSeed = 'Alice'
    let nonce = await getNonce(adminSeed)
    
    async function sudoCall(proposal, bWait = false){
        let tx = api.tx.sudo.sudo(proposal)
        await signAndSendTx(tx, adminSeed, nonce++, bWait)
    }

    // validatorCount
    await sudoCall(api.tx.staking.setValidatorCount(3))
      
    // minimumValidatorCount TODO: which api

    // sessionReward
    // tx = api.tx.rewards.setParameters() // TODO: how to use
    // signAndSendTx(tx, traderSeed, nonce++, false)

    // session number of an era
    await sudoCall(api.tx.staking.setSessionsPerEra(2))

    // block number of an session
    await sudoCall(api.tx.session.setLength(2))

    // ga transfer fee(0x0000)
    await sudoCall(api.tx.fees.setFee('0x0000', '2000000000000000'))
    // base fee(0x0100)
    await sudoCall(api.tx.fees.setFee('0x0100', '1000000000000000'))
    // bytes fee(0x0101)
    await sudoCall(api.tx.fees.setFee('0x0101', '5000000000000'), true)
}



module.exports.setApiSigner = setApiSigner
module.exports.transfer = transfer
module.exports.transferWithNonce = transferWithNonce
module.exports.signAndSendTx = signAndSendTx
module.exports.queryFreeBalance = queryFreeBalance
module.exports.getAccount = getAccount
module.exports.getNonce = getNonce
module.exports.getAddressFromSeed = getAddressFromSeed
module.exports.getTransferFee = getTransferFee
module.exports.topupTestAccount = topupTestAccount
module.exports.setNodeConfig = setNodeConfig
module.exports.waitBalanceChange = waitBalanceChange
