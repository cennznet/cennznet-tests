
"use strict";

// const {spawn} = require('child_process');
const {sleep} = require('./util')
const {bootNodeApi} = require('./websocket');
const shell = require('shelljs');

const { xxhashAsHex } = require('@polkadot/util-crypto');
const { Keyring, decodeAddress } = require('@polkadot/keyring');
const { stringToU8a, hexToBn, u8aToHex } = require('@polkadot/util');
const { Balance, Address, u32, AccountId, AccountIndex, Data, u128 } = require('@polkadot/types') ;
const { AssetId } = require('cennznet-runtime-types');
const { SimpleKeyring, Wallet } = require('cennznet-wallet')


const nodeContainerName = 'integration_test_node'

function startBootNode() {

    shell.exec(`docker run -d --name ${nodeContainerName} \
                -p 9945:9945 -p 9944:9944 -p 30333:30333 -p 30334:30334 \
                -v /tmp/node_data:/tmp/node_data \
                cennznet-node --dev --base-path /tmp/node_data/alice \
                --node-key 0000000000000000000000000000000000000000000000000000000000000001 \
                --bootnodes /ip4/127.0.0.1/tcp/30334/p2p/QmXiB3jqqn2rpiKU7k1h7NJYeBg8WNSx9DiTRKz9ti2KSK \
                --port 30333 \
                --key Alice \
                --name ALICE \
                --validator \
                --ws-external \
                --ws-port 9944`,
                { silent: true },
                function (code, stdout, stderr) {
                    // console.log('Shell CMD exit code:', code);
                    // console.log('Shell CMD output:', stdout);
                    // console.log('Shell CMD stderr:', stderr);
                });
}

function joinNewNode() {

    shell.exec(`docker exec ${nodeContainerName} \
                ./usr/local/bin/cennznet --dev --base-path /tmp/node_data/bob \
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

function shutdownNewNode(){

}

function removeNodeContainers(){
    // remove all relevant containers 
    shell.exec(`docker rm -f $(docker ps -a -q --filter name=${nodeContainerName})`, { silent: true }) 
}

async function awaitBlock( blockId, nodeApi = bootNodeApi) {

    const api = await nodeApi.getApi()

    // listening to the new block
    const currBlockId = await new Promise(async (resolve,reject) => {
        await api.rpc.chain.subscribeNewHead(async (header) => {
            // console.log('subscribeNewHead...')
            let blockNo = parseInt(header.blockNumber.toString())
            if (blockNo >= blockId){
                resolve(blockNo)
            }
        }).catch((error) => {
            console.log('Error =', error);
            done();
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
            console.log('Error =', error);
            done();
        });
    });

    return blockHeader
}


async function sendWaitConfirm(fromSeed, toAddress, amount, nodeApi = bootNodeApi) {

    var bSucc = false;
    const api = await nodeApi.getApi()

    try {
        const _fromSeed = fromSeed.padEnd(32, ' ');

        // Create an instance of the keyring
        const keyring = new Keyring();

        const fromAccount = keyring.addFromSeed(stringToU8a(_fromSeed));

        const nonce = await api.query.system.accountNonce(fromAccount.address());
        
        const transfer = api.tx.balances.transfer(toAddress, amount);

        // Sign the transaction using our account
        transfer.sign(fromAccount, nonce);

        // Send and wait nonce changed
        const hash = await new Promise(async (resolve,reject) => {
            await transfer.send((r) => {
                if ( r.type == 'Finalised' ){
                    console.log('hash =', r.status.raw.toString())
                    resolve(r.status.raw.toString()); // get hash
                }
            }).catch((error) => {
                console.log('Error 1=', error);
                done();
            });
        });

        if (hash.length == 66){
            bSucc = true;
        }   
        else
            bSucc = false;
    }
    catch (e) {
        console.log('Error 2= ', e) 
    }

    return bSucc;
}

async function transfer(fromSeed, toAddress, assetId, amount, nodeApi = bootNodeApi) {
    // console.log('api = ', nodeApi._api)
    const api = await nodeApi.getApi()

    const _fromSeed = fromSeed.padEnd(32, ' ')

    // Create an instance of the keyring
    const tempKeyring = new Keyring();
    // get account of seed
    const fromAccount = tempKeyring.addFromSeed(stringToU8a(_fromSeed));

    // create wallet
    const wallet = new Wallet();
    await wallet.createNewVault('a passphrase');
    const keyring = new SimpleKeyring();
    await keyring.addFromSeed(stringToU8a(_fromSeed));
    await wallet.addKeyring(keyring);

    // set wallet as signer of api
    api.setSigner(wallet)
    // nodeApi._api.setSigner(wallet)

    // do a transfer
    // await api.tx.genericAsset.transfer(assetId, toAddress, amount).send({ from: fromAccount.address() })

    // Send and wait nonce changed
    const hash = await new Promise(async (resolve,reject) => {
        await api.tx.genericAsset.transfer(assetId, toAddress, amount).send({ from: fromAccount.address() }, r => {
            if ( r.type == 'Finalised' ){
                // console.log('hash =', r.status.raw.toString())
                resolve(r.status.raw.toString()); // get hash
            }
        }).catch((error) => {
            console.log('Error =', error);
            done();
        });
    });

    return hash
}

function getAccount(seed){
    const _seed = seed.padEnd(32, ' ');
    const keyring = new Keyring();
    const account = keyring.addFromSeed(stringToU8a(_seed));
    return account
}

// retrive nonce and conver to integer
async function getNonce(address){
    let api = await bootNodeApi.getApi()
    let nonce = await api.query.system.accountNonce( address );
    return parseInt(nonce.toString())   // convert to int
}

async function queryBal(address, nodeApi = bootNodeApi) {

    const api = await nodeApi.getApi()

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
    
    // get bal
    let bal = await api.query.balances.freeBalance(_address);

    console.log(`Bal = ${bal}`);

    return bal
}

async function queryFreeBalance( assetId, address, nodeApi = bootNodeApi ) {    // assetId: 0 - CENNZ, 10 - SPEND
    const prefix = stringToU8a('ga:free:');
    const assetIdEncoded = new u32(new AssetId(assetId)).toU8a();
    const keyEncoded = new Uint8Array(prefix.length + assetIdEncoded.length);
    keyEncoded.set(prefix);
    keyEncoded.set(assetIdEncoded, prefix.length);
    const addrEncoded = u8aToHex(decodeAddress(new Address(address).toString())).substr(2);
    const key = xxhashAsHex(keyEncoded, 128) + addrEncoded;

    const api = await nodeApi.getApi()
    // get balance
    const rawBalance = await api.rpc.state.getStorage(key);
    const balance = new u128(rawBalance)//.toString(10)
    console.log(balance.toString(10))
    // console.log(`Bal_${assetId} = ${balance.toString(10)}`);
    return balance;
}

async function queryFreeBalance2( assetId, address) {    // 0: CENNZ, 10: SPEND
    const prefix = stringToU8a('ga:free:');
    const assetIdEncoded = new u32(new AssetId(assetId)).toU8a();
    const keyEncoded = new Uint8Array(prefix.length + assetIdEncoded.length);
    keyEncoded.set(prefix);
    keyEncoded.set(assetIdEncoded, prefix.length);
    const addrEncoded = u8aToHex(decodeAddress(new Address(address).toString())).substr(2);
    const key = xxhashAsHex(keyEncoded, 128) + addrEncoded;
    // const api = await bootNodeApi.getApi()
    // console.log('api = ',api.rpc)

    const Api = require('cennznet-api').Api
    const api = await Api.create({provider: 'ws://127.0.0.1:9944'})

    const balance = await api.rpc.state.getStorage(key);

    console.log(`Bal_${assetId} = ${balance.toString()}`);

    return balance;
}

// module.exports.nodeContainerName = nodeContainerName
module.exports.awaitBlock = awaitBlock
module.exports.startBootNode = startBootNode
module.exports.joinNewNode = joinNewNode
module.exports.removeNodeContainers = removeNodeContainers
module.exports.sendWaitConfirm = sendWaitConfirm
module.exports.queryLastBlock = queryLastBlock
module.exports.queryBal = queryBal
module.exports.getAccount = getAccount
module.exports.getNonce = getNonce


// _getArgs()

// --------- test code
async function test(){
    await bootNodeApi.init()
    
    
    let hash = await transfer('Bob', '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ', 0, 1000)
    console.log('hash = ', hash)

    await queryFreeBalance(0, '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ')
    await queryFreeBalance(10, '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ' ) 
    

    bootNodeApi.close()

    process.exit()
}

test()