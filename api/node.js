
"use strict";

// const {spawn} = require('child_process');
const { sleep } = require('./util')
const { bootNodeApi } = require('./websocket');
const shell = require('shelljs');
const { getRunContainer } = require('./docker');

const { xxhashAsHex } = require('@polkadot/util-crypto');
const { Keyring, decodeAddress } = require('@polkadot/keyring');
const { stringToU8a, u8aToHex } = require('@polkadot/util');
const { Address, u32, u128 } = require('@polkadot/types') ;
const { AssetId } = require('cennznet-runtime-types');
const { SimpleKeyring, Wallet } = require('cennznet-wallet')
const { SystemFee } = require('./fee')

const currency = {
    CENNZ:  0,
    SPEND:  10,
}

const ciImageName = 'integration_test'
const nodeContainerName = 'integration_test_node'
const chainDataFolder = '/tmp/node_data'


async function startBootNode() {
    
    let linkStr = ''

    // check if there is a integration_test container running
    const ciContainerName = getRunContainer(ciImageName)
    if (ciContainerName.length > 0 ){
        // find container running
        linkStr = `--link ${ciContainerName}`
    }

    const cmd = `docker run --rm --name ${nodeContainerName} ${linkStr} \
                -p 9945:9945 -p 9944:9944 -p 30333:30333 -p 30334:30334 \
                cennznet-node --dev --base-path /tmp/node_data/alice \
                --node-key 0000000000000000000000000000000000000000000000000000000000000001 \
                --bootnodes /ip4/127.0.0.1/tcp/30334/p2p/QmXiB3jqqn2rpiKU7k1h7NJYeBg8WNSx9DiTRKz9ti2KSK \
                --port 30333 \
                --key Alice \
                --name ALICE \
                --validator \
                --ws-external \
                --ws-port 9944`

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
        let wsIp = ''
        for ( let i = 0; i < 60; i++ ){
            wsIp = getBootNodeIp()
            if ( wsIp != '' ){
                break
            }
            await sleep(1000)
        }

        if (wsIp == ''){
            throw new Error('Cannot get boot node ip')
        }
        
        // console.log('wsIp =',wsIp)
        bootNodeApi.setWsIp(`ws://${wsIp}:9944`)
    }
}

function joinNewNode() {

    shell.exec(`docker exec ${nodeContainerName} \
                ./usr/local/bin/cennznet --dev --base-path ${chainDataFolder}/bob \
                --node-key 0000000000000000000000000000000000000000000000000000000000000002 \
                --bootnodes /ip4/127.0.0.1/tcp/30333/p2p/QmQZ8TjTqeDj3ciwr93EJ95hxfDsb9pEYDizUAbWpigtQN \
                --port 30334 \
                --key Bob \
                --name BOB \
                --validator \
                --ws-external \
                --ws-port 9945`,
                { silent: true },
                function (code, stdout, stderr) {
                    // console.log('Shell CMD exit code:', code);
                    // console.log('Shell CMD output:', stdout);
                    // console.log('Shell CMD stderr:', stderr);
                });
}

function getBootNodeIp(){

    const wsIp = shell.exec(`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${nodeContainerName}`,
                            { silent: true },
                            { async: false} )
    
    return wsIp.stdout.toString().replace('\n', '')
}

async function awaitBlock( blockId, nodeApi = bootNodeApi) {

    const api = await nodeApi.getApi()

    // listening to the new block
    const currBlockId = await new Promise(async (resolve,reject) => {
        await api.rpc.chain.subscribeNewHead(async (header) => {
            // console.log('blockNumber...', header.blockNumber.toString())
            let blockNo = parseInt(header.blockNumber.toString())
            if (blockNo >= blockId){
                resolve(blockNo)
            }
        }).catch((error) => {
            reject(error);
        });
    });

    return currBlockId
}

async function queryLastBlock(nodeApi = bootNodeApi) {

    const api = await nodeApi.getApi()

    // listening to the new block
    const blockHeader = await new Promise(async (resolve,reject) => {
        await api.rpc.chain.subscribeNewHead(async (header) => {
            let blockNo = parseInt(header.blockNumber.toString())
            if (blockNo > 0){
                resolve(header)
            }
        }).catch((error) => {
            reject(error);
        });
    });

    return blockHeader
}

async function transfer(fromSeed, toAddress, amount, assetId = currency.CENNZ, nodeApi = bootNodeApi) {
    // console.log('api = ', nodeApi._api)
    const api = await nodeApi.getApi()

    const _fromSeed = fromSeed.padEnd(32, ' ')

    // Create an instance of the keyring
    const tempKeyring = new Keyring();
    // get account of seed
    const fromAccount = tempKeyring.addFromSeed(stringToU8a(_fromSeed));

    await setApiSigner(api, fromSeed)

    const nonce = await getNonce(fromAccount.address())

    // Send and wait nonce changed
    const txResult = await new Promise(async (resolve,reject) => {
        const trans = api.tx.genericAsset.transfer(assetId, toAddress, amount)
        // get tx length (byte)
        const txLen  = trans.sign(fromAccount, nonce).encodedLength;
        await trans.send( r => {
            if ( r.type == 'Finalised' ){
                // console.log('hash =', r.status.raw.toString())
                const txHash = r.status.raw.toString()
                const result = {txHash: txHash, txLength: txLen}
                resolve(result); 
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

async function calTransferFee(byteLength){
    const systemFee = new SystemFee()
    await systemFee.fetchSysFee()
    const totalTransferFee = systemFee.transferFee + systemFee.baseFee + systemFee.byteFee * byteLength
    return totalTransferFee
}

// retrive nonce and conver to integer
async function getNonce(address){
    let api = await bootNodeApi.getApi()
    let nonce = await api.query.system.accountNonce( address );
    return parseInt(nonce.toString())   // convert to int
}


async function queryFreeBalance( address, assetId = currency.CENNZ, nodeApi = bootNodeApi ) {    // assetId: 0 - CENNZ, 10 - SPEND
    
    let _address = null;

    // Operate different input: seed or address
    if ( address.length == 48 ) {   // address
        _address = address
    }
    else{   // seed
        const seed = address.padEnd(32, ' ');
        const keyring = new Keyring();
        const fromAccount = keyring.addFromSeed(stringToU8a(seed));
        _address = fromAccount.address();
    }

    // prepare key for query
    const prefix = stringToU8a('ga:free:');
    const assetIdEncoded = new u32(new AssetId(assetId)).toU8a();
    const keyEncoded = new Uint8Array(prefix.length + assetIdEncoded.length);
    keyEncoded.set(prefix);
    keyEncoded.set(assetIdEncoded, prefix.length);
    const addrEncoded = u8aToHex(decodeAddress(new Address(_address).toString())).substr(2);
    const key = xxhashAsHex(keyEncoded, 128) + addrEncoded;

    // get balance
    const api = await nodeApi.getApi()
    const rawBalance = await api.rpc.state.getStorage(key);
    const balance = new u128(rawBalance).toString()

    // console.log(`${address}_${assetId} bal = `, balance.toString())

    return balance;
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
module.exports.chainDataFolder = chainDataFolder
module.exports.currency = currency
module.exports.awaitBlock = awaitBlock
module.exports.startBootNode = startBootNode
module.exports.joinNewNode = joinNewNode
module.exports.transfer = transfer
module.exports.queryLastBlock = queryLastBlock
module.exports.queryFreeBalance = queryFreeBalance
module.exports.getAccount = getAccount
module.exports.getNonce = getNonce
module.exports.calTransferFee = calTransferFee


// _getArgs()

// --------- test code
async function test(){
    
    let bal = await queryFreeBalance('Alice', 1000006)
    console.log(bal)
    process.exit()
}

// test()

