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
const node = require('./node')
const { bootNodeApi, WsApi } = require('./websocket');
const docker  = require('./docker')
const block = require('./block')
const assert = require('assert')
const {cennznetNode, CURRENCY} = require('./definition')
const BN = require('bignumber.js')

function ValidatorInfo(){
    this.stashSeed = ''
    this.bondAmount = ''     
    this.controllerSeed = '' 
    this.sessionKeySeed = '' 
    this.sessionKeyNode = null
}

// initialize the information for cennznetNode
module.exports.initValidatorConfig = function (){
    // get address for each seed
    for(let key in cennznetNode){
        cennznetNode[key].address = node.getAddressFromSeed(cennznetNode[key].seed)
    }
}

// make a new validator join newwork
module.exports.startNewValidatorNode = async function (sessionKeyAccount) {

    // check peer count before new node joins in
    const bootApi = await bootNodeApi.getApi()
    const peers_Before = await bootApi.rpc.system.peers()
    const peersCnt_Before = peers_Before.length

    // start a new node
    docker.startNewNode(sessionKeyAccount)

    // init the connection to the new node, using 'ws://127.0.0.1:XXXX'
    const newNodeWsIp = bootNodeApi.getWsIp().replace('9944', sessionKeyAccount.wsPort)
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

module.exports.nominateStaker = async function (stashAccSeed, controllerSeed, bondAmount, nomineeStashSeedLst){
    // bond amount first
    await bond(stashAccSeed, controllerSeed, bondAmount)

    const txResult = await nominate(controllerSeed, nomineeStashSeedLst)

    // validator will be added in next era
    await this.waitEraChange()

    return txResult
}

module.exports.unnominateStaker = async function (controllerSeed){
    const txResult = await unnominate(controllerSeed)

    // validator will be added in next era
    await this.waitEraChange()

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

module.exports.checkAdditionalReward = async function ( controllerSeed ){

    let bRet = false
    let expectedEraReward = 0
    let calEraTxFee = 0
    let queryEraTxFee = 0
    let eraBlockIdLst = []
    
    const api = await bootNodeApi.getApi()

    // check if the validator is in staking
    const stakerId = await this.queryStakingControllerIndex(controllerSeed)
    assert(stakerId >= 0, `Controller (${controllerSeed}) is not in staking list.`)

    // get values for formula
    const rewardMultiplierPermill = (await api.query.rewards.feeRewardMultiplier()).toString()
    const blockReward = (await api.query.rewards.blockReward()).toString()
    const blockPerSession = (await api.query.session.sessionLength()).toString()

    // wait for a new era
    await this.waitEraChange()

    // get balance before era reward happen
    const balBeforeEra = await node.queryFreeBalance(controllerSeed, CURRENCY.SPEND)
    
    // push a transfer tx (do not wait finalise) to trigger an tx fee
    // node.transfer('Alice', 'James', '10000', 16000, false, bootNodeApi)
    // node.transfer('Charlie', 'James', '10000', 16000, false, bootNodeApi)
    // node.transfer('Dave', 'James', '10000', 16000, false, bootNodeApi)
    node.transfer('Eve', 'James', '10000', 16000, false, bootNodeApi)
    await node.transfer('Ferdie', 'James', '10000', 16000, true, bootNodeApi)
    node.transfer('Alice', 'James', '10000', 16000, false, bootNodeApi)
    node.transfer('Charlie', 'James', '10000', 16000, false, bootNodeApi)
    node.transfer('Dave', 'James', '10000', 16000, false, bootNodeApi)
    // node.transfer('Eve', 'James', '10000', 16000, false, bootNodeApi)
    // node.transfer('Ferdie', 'James', '10000', 16000, false, bootNodeApi)

    // listen to new block to check all fees
    const finalEraReward = await new Promise(async (resolve, reject) => { 
        let totalEraReward = 0
        let preEraId = (await api.query.staking.currentEra()).toString()
        let preEraReward = (await api.query.staking.currentEraReward()).toString() 
        let preSessionId = (await api.query.session.currentIndex()).toString()
        let preSessionTxFee = (await api.query.rewards.sessionTransactionFee()).toString()

        // subscribe the block change
        api.rpc.chain.subscribeNewHead( async (block) => {
            // get current information
            const currSessionId = (await api.query.session.currentIndex()).toString()
            const currEraReward = (await api.query.staking.currentEraReward()).toString() // era reward will change for each block
            const currSessionTxFee = (await api.query.rewards.sessionTransactionFee()).toString()

            // calculate last session's reward and add it into total reward
            if ( currSessionId > preSessionId ){
                // calculate the additional_reward = block_reward * block_per_session + session_tx_fee * fee_reward_multiplier
                const sessionReward = BN(blockReward).times(blockPerSession).plus(BN(preSessionTxFee).times(rewardMultiplierPermill).div('1000000'))
                totalEraReward = BN(totalEraReward).plus(sessionReward)

                // get total era tx fee
                queryEraTxFee = BN(preSessionTxFee).plus(queryEraTxFee)

                const currEraId = (await api.query.staking.currentEra()).toString()
                
                // check if era changed
                if (currEraId > preEraId){
                    expectedEraReward = preEraReward    // get last era reward
                    resolve(totalEraReward)             // return final reward
                    return
                }
            }

            // add block number to the list
            eraBlockIdLst.push(block.number.toString())
            // update values for next use
            preSessionId = currSessionId
            preEraReward = currEraReward
            preSessionTxFee = currSessionTxFee

        }).catch((error) => {
            reject(error)
        });
    })

    // calculate all tx fee in the era
    for (let i = 0; i < eraBlockIdLst.length; i++ ){
        // get block hash
        let blockHash = await api.rpc.chain.getBlockHash(eraBlockIdLst[i])
        // check all events in the block to find out fee charged
        const events = await api.query.system.events.at(blockHash)
        events.forEach((record) => {
            // extract the phase, event and the event types
            const { event, phase } = record;

            if (event.section.toLowerCase() == 'fees' && event.method.toLowerCase() == 'charged') {
                const feeAmount = event.data[1].toString()
                calEraTxFee = BN(feeAmount).plus(calEraTxFee)
            }
        });
    }

    // get balance after era reward got
    const balAfterEra = await node.queryFreeBalance(controllerSeed, CURRENCY.SPEND)

    // check era tx fee
    assert.equal(
        queryEraTxFee.toString(),
        calEraTxFee.toString(),
        `The amount of session tx fee in an era is wrong.`)

    // check reward
    assert.equal(
        finalEraReward.toString(), expectedEraReward.toString(), `Final era reward is wrong.`)

    // check balance
    assert.equal(
        BN(balAfterEra).toFixed(),
        BN(balBeforeEra).plus(expectedEraReward).toFixed(),
        `${controllerSeed}'s asset(${CURRENCY.SPEND}) balance is wrong`)

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
    // let stakerAddress = ''

    const api = await nodeApi.getApi()

    // if ( stakerSeed.toString().length == 48){   // length is 48 if input is an address
    //     stakerAddress = stakerSeed
    // }
    // else{
    //     stakerAddress = node.getAccount(stakerSeed.toString()).address()
    // }

    const stakerAddress = node.getAddressFromSeed(stakerSeed.toString())

    const stakerList = await api.query.session.validators()

    index = stakerList.indexOf(stakerAddress)
    
    return index
}

module.exports.waitSessionChange = async function(nodeApi = bootNodeApi){
    // get api
    const api = await nodeApi.getApi()

    // get current session
    const preSessionId = (await api.query.session.currentIndex()).toString()

    // listen to new session
    const newSessionId = await new Promise(async (resolve, reject) => { 
        api.query.session.currentIndex((session) => {
            let currSessionId = session.toString()
            if ( currSessionId > preSessionId ){
                resolve(currSessionId)
            }
        }).catch((error) => {
            reject(error)
        });
    })

    return newSessionId
}

module.exports.getEraReward = async function(nodeApi = bootNodeApi){
    // get api
    const api = await nodeApi.getApi()

    let preAccumulatedEraReward = await api.query.staking.currentEraReward()

    // listen to new session
    const totalEraReward = await new Promise(async (resolve, reject) => { 
        // era reward is changing after each block
        api.query.staking.currentEraReward(async (currAccumulatedEraReward) => {
            let fee = await api.query.rewards.sessionTransactionFee()
            
            // if era changed, the reward would be cleared, so the previous value is the total reward for last ear.
            if ( BN(currAccumulatedEraReward.toString()).lt(preAccumulatedEraReward.toString()) ){
                resolve(preAccumulatedEraReward)
            }
            else{
                preAccumulatedEraReward = currAccumulatedEraReward
            }
        }).catch((error) => {
            reject(error)
        });
    })

    return totalEraReward.toString()
}

module.exports.waitEraChange = async function(nodeApi = bootNodeApi){
    // get api
    const api = await nodeApi.getApi()

    // get current session
    const previouseEraId = (await api.query.staking.currentEra()).toString()

    // listen to new session
    const newEraId = await new Promise(async (resolve, reject) => { 
        api.query.staking.currentEra(async (era) => {
            let currentEraId = era.toString()
            if ( currentEraId > previouseEraId ){
                resolve(currentEraId)
            }
        }).catch((error) => {
            reject(error)
        });
    })

    return newEraId
}

module.exports.bondExtra = async function (controllerSeed, bondAmount, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()

    // bond extra fund
    const trans = api.tx.staking.bondExtra(bondAmount.toString())

    // stake the validator
    const txResult = await node.signAndSendTx(trans, controllerSeed)

    return txResult
}

module.exports.getPoorestStaker = async function(nodeApi = bootNodeApi){ 
    const api = await nodeApi.getApi()
    const stakerList = await api.query.session.validators()

    let poorestControllerAddress = ''
    let leastTotalBondAmount = 0

    for (let i = 0; i < stakerList.length; i++){
        let ledger = await api.query.staking.ledger(stakerList[i])
        const totalBondAmount = BN(ledger.raw.total.toString())
        if ( leastTotalBondAmount == 0 || BN(totalBondAmount).lt(leastTotalBondAmount)){
            leastTotalBondAmount = totalBondAmount
            poorestControllerAddress = stakerList[i]
        }
    }
    
    return poorestControllerAddress
}

module.exports.getTotalBondAmount = async function(stashSeed, nodeApi = bootNodeApi){ 
    const api = await nodeApi.getApi()
    const stashAddress = node.getAddressFromSeed(stashSeed)
    const stakers = await api.query.staking.stakers(stashAddress)

    return stakers.total.toString()
}

module.exports.getAllNominators = async function(stashSeed, nodeApi = bootNodeApi){ 
    const api = await nodeApi.getApi()
    const stashAddress = node.getAddressFromSeed(stashSeed)
    const stakers = await api.query.staking.stakers(stashAddress)

    return nominatorLst
}

async function bond(stashAccSeed, controllerSeed, bondAmount, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()

    const controllerAddress = node.getAddressFromSeed(controllerSeed)

    // make the tx to bond
    //  Staked, 0x00: Pay into the stash account, increasing the amount at stake accordingly.
    //  Stash, 0x01 :Pay into the stash account, not increasing the amount at stake.
    //  Controller, 0x02: Pay into the controller account. ( Controller is the only one for 'validate' method)
    const trans = api.tx.staking.bond(controllerAddress, bondAmount.toString(), 0x02)

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
    const validatorPrefs = '0x0000'

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

async function nominate(controllerSeed, nomineeSeedLst, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()

    const nomineeAddressLst = []

    for (let i = 0; i < nomineeSeedLst.length; i++){
        nomineeAddressLst.push( node.getAddressFromSeed(nomineeSeedLst[i])  )
    }

    // make tx to stake
    const tx = api.tx.staking.nominate(nomineeAddressLst)

    // send tx
    const txResult = await node.signAndSendTx(tx, controllerSeed)

    return txResult
}

async function unnominate(controllerSeed, nodeApi = bootNodeApi){ 
    // send tx
    const txResult = await unstake(controllerSeed)

    return txResult
}