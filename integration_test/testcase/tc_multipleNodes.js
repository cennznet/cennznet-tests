
"use strict";

const assert = require('assert')
const node = require('../../api/node')
const {sleep} = require('../../api/util')
const {bootNodeApi, WsApi} = require('../../api/websocket')
const shell = require('shelljs');
const staking = require('../../api/staking')
const BigNumber = require('big-number');
const {validatorNode} = require('../../api/definition')



describe('Multiple Nodes test cases ...', function () {

    it('New validator node(Bob) joins in', async function() {
        this.timeout(60000)

        let txResult = null
        // startup a new validator node 
        try{
            txResult = await joinNewValidator( validatorNode.bob )
        }
        catch(e){
            console.log('Error =', e)
        }
        
        // judge the peer count
        assert( txResult == true, `New validator [${validatorNode.bob.seed}] failed to join the boot node.`)
    });

    it('Make validator Bob begin to stake', async function() {
        this.timeout(60000)

        await stakeValidator(validatorNode.bob.seed)
    });

    it('Start validator James (new account) and make it stake', async function() {
        this.timeout(120000)

        // topup before stake to have enough fund
        await node.transfer('Alice', validatorNode.james.address, 1000000000000000000000000, 0)     // staking token
        await node.transfer('Alice', validatorNode.james.address, 1000000000000000000000000, 10)    // spending token
        
        // startup a new validator node 
        const txResult = await joinNewValidator( validatorNode.james )
        // judge the peer count
        assert( txResult == true, `New validator [${validatorNode.james.seed}] failed to join the boot node.`)

        // stake
        await stakeValidator(validatorNode.james.seed)
    
    });

    it('Staking validator (James) obtains reward', async function() {
        this.timeout(60000)
    
        await checkReward(validatorNode.james)
    });

    it('Let richer validator (eve) stake and validator James will be replaced', async function() {
        this.timeout(120000)
    
        await stakeValidator(validatorNode.eve.seed)

        // await staking.waitEraChange()

        const stakeId_eve = await staking.queryStakerIndex(validatorNode.eve.seed)
        const stakeId_james = await staking.queryStakerIndex(validatorNode.james.seed)

        assert( stakeId_eve >= 0, `Failed to make richer validator [${validatorNode.eve.seed}] into staking list.`)
        assert( stakeId_james < 0, `Failed to kick validator [${validatorNode.james.seed}] out from staking list.`)
    });

    it('Unstake validator (eve) and validator James came back', async function() {
        this.timeout(120000)
    
        await unstakeValidator(validatorNode.eve.seed)

        const stakeId_eve = await staking.queryStakerIndex(validatorNode.eve.seed)
        const stakeId_james = await staking.queryStakerIndex(validatorNode.james.seed)

        assert( stakeId_eve < 0, `Failed to unstake validator [${validatorNode.eve.seed}].`)
        assert( stakeId_james >= 0, `Failed to put validator [${validatorNode.james.seed}] back to staking list.`)
    });

    it('Shutdown one of three validators (node James), chain is still working', async function() {
        this.timeout(60000)
        
        // stop the docker container
        node.dropNode(validatorNode.james.containerName)

        // await at least 5 blocks
        const currBlockNum = await node.awaitBlockCnt(5)

        assert(currBlockNum > 5, `Chain did not work well. (Current block id [${currBlockNum}])`)
    });

    it('Offline validator (James) obtains punishment. TODO: When will start the punishment', async function() {
        this.timeout(60000)

        const validator = validatorNode.james
        
        // await one era to ensure the valiator is leaving.
        // await staking.waitEraChange()

        const bal_preSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

        await staking.waitSessionChange()

        const bal_afterSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

        // bal_afterSession < bal_preSession,
        assert( BigNumber(bal_preSession).minus(bal_afterSession).gt(0),
                `Validator [${validator.seed}] did not get punishment.(Bal before tx = ${bal_preSession}, Bal after tx = ${bal_afterSession})`)
    });

    it('Make validator Bob unstake', async function() {
        this.timeout(60000)

        await unstakeValidator(validatorNode.bob.seed)
    });

});

// make a new validator join newwork
async function joinNewValidator( validator ) {

    // check peer count before new node joins in
    const bootApi = await bootNodeApi.getApi()
    const peers_Before = await bootApi.rpc.system.peers()
    const peersCnt_Before = peers_Before.length
    // console.log('peers =', peersCnt_Before)

    // start a new node
    node.startNewValidator(validator.containerName, validator.seed, validator.htmlPort, validator.wsPort, validator.workFolder)

    // init the connection to the new node, using 'ws://127.0.0.1:XXXX'
    const newNodeWsIp = bootNodeApi.getWsIp().replace('9944', validator.wsPort)
    // console.log('newNodeWsIp =', newNodeWsIp)
    const newNodeApi = new WsApi(newNodeWsIp)
    await newNodeApi.init()

    // await at least 5 blocks
    await node.awaitBlockCnt(5, newNodeApi)
    
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

async function stakeValidator(validatorSeed){
    // stake
    await staking.stake(validatorSeed)

    // validator will be added in next era
    await staking.waitEraChange()

    // get staker sequence id
    const stakerId = await staking.queryStakerIndex(validatorSeed)

    // check if the validator is in the staker list
    assert( stakerId >= 0, `Failed to make validator [${validatorSeed}] stake.`)
}

async function unstakeValidator(validatorSeed){
    // get staker id before tx
    const stakerId_beforeTx = await staking.queryStakerIndex(validatorSeed)
    assert( stakerId_beforeTx >= 0, `Validator [${validatorSeed}] is not in staking list.`)

    // unstake
    await staking.unstake(validatorSeed)

    // validator will be removed in next era
    await staking.waitEraChange()

    // // get staker id after tx
    const stakerId_AfterTx = await staking.queryStakerIndex(validatorSeed)
    
    // check if the validator is removed from the staker list
    assert( stakerId_AfterTx < 0, `Failed to make validator [${validatorSeed}] unstake.[Actual ID = ${stakerId_AfterTx}]`)
}

// check if any reward is saved into account
async function checkReward(validator){

    let bRet = false

    // check if the validator is in stake
    const stakerId = await staking.queryStakerIndex(validator.seed)
    assert(stakerId >= 0, `Validator (${validator.seed}) is not in staking list.`)

    const containerId = node.queryNodeContainer(validator.containerName)
    assert(containerId.length > 0, `Container node (${validator.containerName}) is not existing.`)

    const bal_preSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

    await staking.waitSessionChange()

    const bal_afterSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

    assert(BigNumber(bal_afterSession).minus(bal_preSession).gt(0),
        `Validator [${validator.seed}] did not get reward.(Bal before tx = ${bal_preSession}, Bal after tx = ${bal_afterSession})`)

    bRet = true
    return bRet
}
