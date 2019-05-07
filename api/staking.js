
const mlog = require('mocha-logger')
const node = require('./node')
const { bootNodeApi, WsApi } = require('./websocket');
const { hexToBn } = require('@cennznet/util');
const docker  = require('./docker')
const block = require('./block')
const assert = require('assert')
const {cennznetNode} = require('./definition')

// initialize the information for cennznetNode
module.exports.initValidatorConfig = function (){
    // get address for each seed
    for(let key in cennznetNode){
        cennznetNode[key].address = node.getAddressFromSeed(cennznetNode[key].seed)
    }
}

// make a new validator join newwork
module.exports.startNewcennznetNode = async function (sessionKeyAccount) {

    // check peer count before new node joins in
    const bootApi = await bootNodeApi.getApi()
    const peers_Before = await bootApi.rpc.system.peers()
    const peersCnt_Before = peers_Before.length
    // console.log('peers =', peersCnt_Before)

    // start a new node
    docker.startNewNode(sessionKeyAccount)

    // init the connection to the new node, using 'ws://127.0.0.1:XXXX'
    const newNodeWsIp = bootNodeApi.getWsIp().replace('9944', sessionKeyAccount.wsPort)
    // console.log('newNodeWsIp =', newNodeWsIp)
    const newNodeApi = new WsApi(newNodeWsIp)
    await newNodeApi.init()

    // await at least 2 blocks
    await block.waitBlockCnt(2, newNodeApi)
    
    // wait for the peer count change
    const txResult = await new Promise(async (resolve, reject) => {
       await bootApi.rpc.system.peers((peers) => {
            let currentPeerCnt = peers.length
            if ( currentPeerCnt != peersCnt_Before ) {
                resolve(true)
            }
        }).catch((error) => {
            reject(error)
        });
    });

    // close the api
    newNodeApi.close()

    return txResult
}

module.exports.startStaking = async function (stashAccSeed, controllerSeed, sessionKeySeed, bondAmount){
    // bond amount first
    await bond(stashAccSeed, controllerSeed, bondAmount)

    // set seesion key
    await setSessionKey(controllerSeed, sessionKeySeed)

    // stake
    await stake(controllerSeed)

    // validator will be added in next era
    await this.waitEraChange()

    // get staker sequence id
    const stakerId = await this.queryStakingControllerIndex(controllerSeed)

    // check if the validator is in the staker list
    // assert( stakerId >= 0, `Failed to make validator [${controllerSeed}] stake.`)

    // await 1 new block
    // await block.waitBlockCnt(1)

    return stakerId
}

module.exports.endStaking = async function (controllerSeed){
    // get staker id before tx
    const stakerId_beforeTx = await this.queryStakingControllerIndex(controllerSeed)
    assert( stakerId_beforeTx >= 0, `Controller [${controllerSeed}] is not in staking list.`)

    // unstake
    await unstake(controllerSeed)

    // validator will be removed in next era
    await this.waitEraChange()

    // // get staker id after tx
    const stakerId_AfterTx = await this.queryStakingControllerIndex(controllerSeed)
    
    // check if the validator is removed from the staker list
    assert( stakerId_AfterTx < 0, `Failed to make controller [${controllerSeed}] unstake.[Actual ID = ${stakerId_AfterTx}]`)
}

module.exports.checkReward = async function (validator){

    let bRet = false

    const api = await bootNodeApi.getApi()

    const staker = await api.query.staking.stakers(validator.address)
    console.log('total =', staker.total.toString())
    console.log('own =', staker.own.toString())

    // check if the validator is in staking
    const stakerId = await this.queryStakingControllerIndex(validator.seed)
    assert(stakerId >= 0, `Validator (${validator.seed}) is not in staking list.`)

    const containerId = docker.queryNodeContainer(validator.containerName)
    assert(containerId.length > 0, `Container node (${validator.containerName}) is not existing.`)

    const bal_preSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

    await waitSessionChange()

    const bal_afterSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

    assert(BigNumber(bal_afterSession).minus(bal_preSession).gt(0),
        `Validator [${validator.seed}] did not get reward.(Bal before tx = ${bal_preSession}, Bal after tx = ${bal_afterSession})`)

    bRet = true
    return bRet
}

module.exports.queryIntentionIndex = async function(stakerSeed, nodeApi = bootNodeApi){ 
    let index = -1;

    // get api
    const api = await nodeApi.getApi()

    const stakerAddress = node.getAccount(stakerSeed).address()

    // get intentions list
    const intentionList = await api.query.staking.intentions()

    // get the intention index
    index = intentionList.indexOf(stakerAddress)
    
    return index
}

module.exports.queryStakingControllerIndex = async function(stakerSeed, nodeApi = bootNodeApi){ 
    let index = -1;

    // get api
    const api = await nodeApi.getApi()

    const stakerAddress = node.getAccount(stakerSeed).address()

    // get intentions list
    const stakerList = await api.query.session.validators()

    // get the intention index
    index = stakerList.indexOf(stakerAddress)
    
    return index
}

module.exports.waitSessionChange = async function(nodeApi = bootNodeApi){
    // get api
    const api = await nodeApi.getApi()

    // get current session
    const previouseSessionId = (await api.query.session.currentIndex()).toString()

    // listen to new session
    const newSessionId = await new Promise(async (resolve, reject) => { 
        api.query.session.currentIndex((session) => {
            let currentSessionId = session.toString()
            if ( currentSessionId > previouseSessionId ){
                resolve(currentSessionId)
            }
        }).catch((error) => {
            reject(error)
        });
    })

    // console.log('sessionIndex =',sessionIndex.toString())

    return newSessionId
}

module.exports.waitEraChange = async function(nodeApi = bootNodeApi){
    // get api
    const api = await nodeApi.getApi()

    // get current session
    const previouseEraId = (await api.query.staking.currentEra()).toString()

    // listen to new session
    const newEraId = await new Promise(async (resolve, reject) => { 
        api.query.staking.currentEra((era) => {
            let currentEraId = era.toString()
            // console.log('currentEraId =',currentEraId)
            if ( currentEraId > previouseEraId ){
                resolve(currentEraId)
            }
        }).catch((error) => {
            reject(error)
        });
    })

    // console.log('sessionIndex =',sessionIndex.toString())

    return newEraId
}

module.exports.bondExtra = async function (controllerSeed, bondAmount, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()

    const amountBN = hexToBn(bondAmount.toString(16))

    // bond extra fund
    const trans = api.tx.staking.bondExtra(amountBN)

    // stake the validator
    const txResult = await node.signAndSendTx(trans, controllerSeed)

    return txResult
}

async function bond(stashAccSeed, controllerSeed, bondAmount, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()

    const controllerAddress = node.getAddressFromSeed(controllerSeed)

    const amountBN = hexToBn(bondAmount.toString(16))

    // make the tx to bond
    //  Staked, 0x00: Pay into the stash account, increasing the amount at stake accordingly.
    //  Stash, 0x01 :Pay into the stash account, not increasing the amount at stake.
    //  Controller, 0x02: Pay into the controller account. ( Controller is the only one for 'validate' method)
    const trans = api.tx.staking.bond(controllerAddress, amountBN, 0x02)

    // send tx
    const txResult = await node.signAndSendTx(trans, stashAccSeed)

    return txResult
}

async function setSessionKey(controllerSeed, sessionKeySeed, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()

    const sessionKey = node.getAddressFromSeed(sessionKeySeed, 'ed25519') // ed25519 is only for session key setting.

    // Set the session key for a validator. The session key is an address.
    const tx = api.tx.session.setKey(sessionKey)

    // send tx
    const txResult = await node.signAndSendTx(tx, controllerSeed)

    return txResult
}

async function stake(controllerSeed, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()
    
    // make prefs: 
    // e.g. 0x0400 = {unstake_threshold: 1, validator_payment: 0}
    // - unstake_threshold (U8a, first 2 digitals): 04 = 1
    // - validator_payment (U8a, last 2 digitals): 00 = 0 
    const validatorPrefs = '0x0400'

    // make tx to stake
    const trans = api.tx.staking.validate(validatorPrefs)

    // send tx
    const txResult = await node.signAndSendTx(trans, controllerSeed)

    return txResult
}

async function unstake(controllerSeed, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()

    // make the tx to unstake
    const trans = api.tx.staking.chill()

    // unstake the validator
    const txResult = await node.signAndSendTx(trans, controllerSeed)

    return txResult
}