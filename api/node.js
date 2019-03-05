
"use strict";

// const {spawn} = require('child_process');
const { sleep } = require('./util')
const { bootNodeApi } = require('./websocket');
const shell = require('shelljs');
const { getRunContainer } = require('./docker');
const { TxResult, CURRENCY } = require('./definition');

const { xxhashAsHex } = require('@polkadot/util-crypto');
const { Keyring, decodeAddress } = require('@polkadot/keyring');
const { stringToU8a, u8aToHex, hexToBn } = require('@polkadot/util');
const { Address, u32, u128 } = require('@polkadot/types') ;
const { AssetId } = require('cennznet-runtime-types');
const { SimpleKeyring, Wallet } = require('cennznet-wallet')
const { GenericAsset}  = require('cennznet-generic-asset')

const { queryTxFee } = require('./fee')
const { validatorNode } = require('./definition')
const BigNumber = require('big-number');


// const CURRENCY = {
//     CENNZ:  0,
//     SPEND:  10,
// }

const ciImageName = 'integration_test'
var bootNodeIp = ''
var nodeKey = 2 // start from 2

async function startBootNode() {
    
    let linkStr = ''

    // check if there is a integration_test container running
    const ciContainerName = getRunContainer(ciImageName)
    if (ciContainerName.length > 0 ){
        // find container running
        linkStr = `--link ${ciContainerName}`
    }

    const cmd = `docker run --net bridge --rm --name ${validatorNode.alice.containerName} ${linkStr} \
                -v ${validatorNode.alice.workFolder}:${validatorNode.alice.workFolder} \
                -p ${validatorNode.alice.wsPort}:${validatorNode.alice.wsPort} \
                cennznet-node --dev --base-path ${validatorNode.alice.workFolder}/node_data/${validatorNode.alice.seed} \
                --chain ${validatorNode.alice.workFolder}/nodeConfig.json \
                --node-key 0000000000000000000000000000000000000000000000000000000000000001 \
                --port ${validatorNode.alice.htmlPort} \
                --key ${validatorNode.alice.seed} \
                --name ${validatorNode.alice.seed} \
                --validator \
                --ws-external \
                --ws-port ${validatorNode.alice.wsPort}`

    // console.log(cmd)

    shell.exec( cmd,
                { silent: true },
                function (code, stdout, stderr) {
                    // console.log('Shell CMD exit code:', code);
                    // console.log('Shell CMD output:', stdout);
                    // console.log('Shell CMD stderr:', stderr);
                });
            
    // get the ws ip of node
    if (ciContainerName.length > 0) {
        // find container running, reset the wsIp. Only used when test running in docker image.
        bootNodeIp = ''
        for ( let i = 0; i < 60; i++ ){
            bootNodeIp = getBootNodeIp()
            if ( bootNodeIp != '' ){
                break
            }
            await sleep(1000)
        }

        if (bootNodeIp == ''){
            throw new Error('Cannot get boot node ip')
        }
        
        // console.log('wsIp =',wsIp)
        bootNodeApi.setWsIp(`ws://${bootNodeIp}:9944`)
    }
}

function startNewValidator(containerName, keySeed, htmlPort, wsPort, workFolder) {

    // run a validator node in the same container.
    const _bootNodeIp = getBootNodeIp()

    const cmd = `docker run --net bridge --rm --name ${containerName} \
                -v ${workFolder}:${workFolder} \
                -p ${wsPort}:${wsPort} \
                cennznet-node --dev --base-path ${workFolder}/node_data/${keySeed} \
                --chain ${workFolder}/nodeConfig.json \
                --node-key 000000000000000000000000000000000000000000000000000000000000000${nodeKey++} \
                --bootnodes /ip4/${_bootNodeIp}/tcp/30333/p2p/QmQZ8TjTqeDj3ciwr93EJ95hxfDsb9pEYDizUAbWpigtQN \
                --port ${htmlPort} \
                --key ${keySeed} \
                --name ${keySeed} \
                --validator \
                --ws-external \
                --ws-port ${wsPort}`

    // console.log(cmd)

    shell.exec( cmd,
                { silent: true }, 
                function (code, stdout, stderr) {
                    // console.log('Shell CMD exit code:', code);
                    // console.log('Shell CMD output:', stdout);
                    // console.log('Shell CMD stderr:', stderr);
                });
}

function dropNode(containerName) {

    const cmd = `docker stop ${containerName}`

    shell.exec( cmd,
                { silent: true }, 
                function (code, stdout, stderr) {
                    // console.log('Shell CMD exit code:', code);
                    // console.log('Shell CMD output:', stdout);
                    // console.log('Shell CMD stderr:', stderr);
                });
}

function getBootNodeIp(){

    const wsIp = shell.exec(`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${validatorNode.alice.containerName}`,
                            { silent: true },
                            { async: false} )
    
    return wsIp.stdout.toString().replace('\n', '')
}

function queryNodeContainer(containerName){
    // query the exact container
    const cmd = `docker ps -q --filter name=^/${containerName}$`

    const result = shell.exec( cmd,
                    { silent: true }, 
                    { async: false});

    return result.stdout.toString().replace('\n', '')
}

// await specified block number
async function awaitBlockCnt( blockNum, nodeApi = bootNodeApi) {

    const api = await nodeApi.getApi()

    let unsubscribe = null

    // listening to the new block
    const currBlockId = await new Promise(async (resolve,reject) => {
        let currblockCnt = 0
        unsubscribe = await api.rpc.chain.subscribeNewHead(async (header) => {
            console.log('blockNumber...', header.blockNumber.toString())
            currblockCnt++
            let blockNo = parseInt(header.blockNumber.toString())
            // if (blockNo >= blockId){
            if (currblockCnt >= blockNum){
                resolve(blockNo)
            }
        }).catch((error) => {
            reject(error);
        });
    });

    // unsubscribe...
    unsubscribe()
    
    return currBlockId
}

async function transfer(fromSeed, toAddress, amount, assetId = CURRENCY.STAKE, nodeApi = bootNodeApi) {
    // console.log('api = ', nodeApi._api)
    const api = await nodeApi.getApi()

    // get account of seed
    const fromAccount = getAccount(fromSeed)

    await setApiSigner(api, fromSeed)

    const nonce = await getNonce(fromAccount.address())

    const amountBN = hexToBn(amount.toString(16))

    // convert to address if input is a seed
    const _toAddress = getAddressFromSeed(toAddress)

    const txResult = new TxResult()

    // Send and wait nonce changed
    await new Promise(async (resolve,reject) => {
        const trans = api.tx.genericAsset.transfer(assetId, _toAddress, amountBN)
        // get tx hash and length (byte)
        const signedTx = trans.sign(fromAccount, nonce)
        txResult.txHash = signedTx.hash.toString()
        txResult.byteLength = signedTx.encodedLength
        // send tx
        await trans.send( r => {
            if ( r.type == 'Finalised' ){
                // get block hash
                txResult.blockHash = r.status.asFinalised.toHex()
                // get extrinsic id
                txResult.extrinsicIndex = r.events[0].phase.asApplyExtrinsic.toString()
                // set tx result symbol
                txResult.bSucc = true
                resolve(true); 
            }
        }).catch((error) => {
            reject(error);
        });
    });

    if (txResult.bSucc){
        txResult.txFee = await queryTxFee(txResult.blockHash, txResult.txHash, nodeApi)
    }

    return txResult
}

async function signAndSendTx(transaction, seed){
    const txResult = new TxResult()
    // get staker account
    const account = getAccount(seed)
    // get valid nonce
    const nonce = await getNonce(account.address());

    // Send and wait nonce changed
    await new Promise(async (resolve,reject) => {
        // get tx hash and length (byte)
        const signedTx = transaction.sign(account, nonce)
        txResult.txHash = signedTx.hash.toString()
        txResult.byteLength = signedTx.encodedLength
        // send tx
        await transaction.send( r => {
            if ( r.type == 'Finalised' ){
                // get block hash
                txResult.blockHash = r.status.asFinalised.toHex()
                // get extrinsic id
                txResult.extrinsicIndex = r.events[0].phase.asApplyExtrinsic.toString()
                // set tx result symbol
                txResult.bSucc = true
                // get all events
                txResult.events = r.events

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
    const ga = new GenericAsset(api);
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
module.exports.awaitBlockCnt = awaitBlockCnt
module.exports.startBootNode = startBootNode
module.exports.dropNode = dropNode
module.exports.queryNodeContainer = queryNodeContainer
module.exports.startNewValidator = startNewValidator
module.exports.transfer = transfer
module.exports.signAndSendTx = signAndSendTx
// module.exports.queryLastBlock = queryLastBlock
module.exports.queryFreeBalance = queryFreeBalance
module.exports.getAccount = getAccount
module.exports.getNonce = getNonce
module.exports.getAddressFromSeed = getAddressFromSeed


// _getArgs()

// --------- test code
async function test(){
    
    let bal = await queryFreeBalance('Alice', 1000006)
    console.log(bal)
    process.exit()
}

// test()

