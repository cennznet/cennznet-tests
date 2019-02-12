"use strict";

const { ApiPromise } = require('@polkadot/api');
const { WsProvider } = require('@polkadot/rpc-provider');
const { Keyring } = require('@polkadot/keyring');
const { stringToU8a, bnToHex } = require('@polkadot/util');
const { bootNodeApi } = require('./api/websocket')
const { Api } = require('cennznet-api')

function getAccount(seed){
    const _seed = seed.padEnd(32, ' ');
    const keyring = new Keyring();
    const account = keyring.addFromSeed(stringToU8a(_seed));
    return account
}

// retrive nonce and conver to integer
async function getNonce(api, address){
    let nonce = await api.query.system.accountNonce( address );
    return parseInt(nonce.toString())   // convert to int
}

async function getClaim(api, holder, issuer, topic){
    let claim = await api.query.attestation.values([holder, issuer, topic]);
    return bnToHex(claim);
}


async function test(){

    console.log('start test')
    // await bootNodeApi.init()

    const provider = new WsProvider('ws://127.0.0.1:9944')
    const api = await ApiPromise.create();
    // const api = await Api.create(provider)
    // const api = await Api.create({provider:'wss://cennznet-node-0.centrality.me:9944'});

    /// Copy this
    const alice = getAccount('Alice')
    const singleSource = getAccount('Bob')
    const asb = getAccount('Charlie')
    const spark = getAccount('Dave')
    
    const namesMap = {
        [alice.address()]: 'Alice',
        [asb.address()]: 'ASB',
        [spark.address()]: "Spark",
        [singleSource.address()]: "SingleSource",
    }

    const ssKYC = '0xa870ab713c422c58f565d7a560198804';
    // const sparkAddress = '0xd6158cf83d045bd121f6122cafccffef';

    // get nonce for singleSource
    console.log('get nonce for singleSource...')
    let nonceSingleSource = await getNonce( api, singleSource.address() );
    // let nonceSpark = await getNonce( api, spark.address() );

    console.log('nonce = ', nonceSingleSource)

    /// Run this
    console.log('setClaim KYC --------')
    // let trans = await api.tx.attestation.setClaim(alice.address(), 'KYC', ssKYC)
    // trans.sign(singleSource, currNonceSingleSource ++)
    // await trans.send()

    let tx =  api.tx.attestation.setClaim(alice.address(), 'KYC', ssKYC)
    tx.sign(singleSource, nonceSingleSource ++) 

    let result = await new Promise(async (resolve,reject) => {
        await tx.send( ({ events = [], status, type }) => {
            if (type === 'Finalised') {
                resolve(type)
            }
        }).catch((error) => {
            console.log('Error =', error);
            reject(error.toString())
            // done();
        });
    });

    // let result = await new Promise(async (resolve,reject) => {
    //     await api.tx.attestation.setClaim(alice.address(), 'KYC', ssKYC)
    //     .sign(singleSource, nonceSingleSource ++)
    //     .send( ({ events = [], status, type }) => {
    //         if (type === 'Finalised') {
    //             resolve(type)
    //         }
    //     }).catch((error) => {
    //         console.log('Error =', error);
    //         reject(error.toString())
    //         // done();
    //     });
    // });

    const value1 = await getClaim(api, alice.address(), singleSource.address(), 'KYC')
    console.log('value1 =',value1)

    // api.tx.attestation.setClaim(alice.address(), 'KYC', ssKYC)
    //     .sign(singleSource, nonceSingleSource ++)
    //     .send( ({ events = [], status, type }) => {
    //         console.log('Transaction status:', type);

    //         if (type === 'Finalised') {
    //             console.log('Completed at block hash', status.asFinalised.toHex());
    //             console.log('Events:');

    //             events.forEach(({ phase, event: { data, method, section } }) => {
    //             console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
    //             });

    //             process.exit(0);
    //         }
    //     });

    
    /// Run this
    // console.log('setClaim Address --------')
    // api.tx.attestation.setClaim(alice.address(), 'Address', sparkAddress).sign(spark, nonceSpark ++).send();
    /*
    result = await new Promise(async (resolve,reject) => {
        await api.tx.attestation.setClaim(alice.address(), 'Address', sparkAddress)
        .sign(spark, nonceSpark ++)
        .send( ({ events = [], status, type }) => {
            if (type === 'Finalised') {
                resolve(type)
            }
        }).catch((error) => {
            console.log('Error =', error);
            done();
        });
    });
    */

    /// Copy this then call getClaims();
    let holder = alice.address();
    let issuers = [singleSource.address(), spark.address(), asb.address()];
    let topics = ['KYC', 'Address', 'Passport']

    // const getClaim = async ({ holder, issuer, topic }) => {
    //     let claim = await api.query.attestation.values([holder, issuer, topic]);
    //     return claim;
    // };

    // const getClaims = async () => {
    //     issuers.forEach(issuer => {
    //         topics.forEach(async (topic) => {
    //             const claim = await getClaim({ holder, issuer, topic });
    //             // console.log('claim = ', claim)
    //             if (claim != null && claim.toString() !== '0') {
    //                 console.log(`Alice has a ${topic} claim from ${namesMap[issuer]} with value ${bnToHex(claim)}`);
    //             }
    //         })
    //     });
    // }
    
    async function getClaims(){
        issuers.forEach(issuer => {
            topics.forEach(async (topic) => {
                const claim = await getClaim({ holder, issuer, topic });
                // console.log('claim = ', claim)
                if (claim != null && claim.toString() !== '0') {
                    console.log(`Alice has a ${topic} claim from ${namesMap[issuer]} with value ${bnToHex(claim)}`);
                }
            })
        });
    }

    // console.log('getClaims --------')
    // await getClaims()

    /// Run this
    console.log('removeClaim KYC --------')
    api.tx.attestation.removeClaim(alice.address(), 'KYC').sign(singleSource, nonceSingleSource ++).send();
    ///

    // console.log('removeClaim KYC --------')
    // api.tx.attestation.removeClaim(alice.address(), 'Address').sign(spark, nonceSpark ++).send();

    // bootNodeApi.close()
}


async function run(){
    try{
        await test()
    }
    catch(e){
        console.log('exception = ', e)
    }
    
    process.exit()
}

run()





