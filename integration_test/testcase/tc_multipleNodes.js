
"use strict";

const assert = require('assert')
const node = require('../../api/node')
const docker = require('../../api/docker')
const block = require('../../api/block')
const {sleep} = require('../../api/util')
const {bootNodeApi, WsApi} = require('../../api/websocket')
const staking = require('../../api/staking')
const BigNumber = require('big-number');
const {validatorNode} = require('../../api/definition')



describe('Multiple Nodes test suite', () => {

    const smallBondAmount = 10000000000000000
    const largeBondAmount = 20000000000000000

    it("New controller (for validator Charlie) node Bob joins in", async function() {

        const txResult = await startNewValidatorNode( validatorNode.bob )    
        // judge the peer count
        assert( txResult == true, `New validator [${validatorNode.bob.seed}] failed to join the boot node.`)
    });

    it('Make controller Bob begin to stake', async function() {
        // Bob is inheret account which has been stashed, so don't need to bond() again
        const stashAccSeed = 'Charlie'
        const controllerSeed = validatorNode.bob.seed
        const bondAmount = largeBondAmount

        await startStaking(stashAccSeed, controllerSeed, bondAmount)
    });

    it('Startup controller James (new account) and make it stake', async function() {
        this.timeout(120000)

        const stashAccSeed = 'Dave'
        const controllerSeed = validatorNode.james.seed
        const bondAmount = smallBondAmount
        const trans_amount  = 10000000000000000
        

        // topup to pay tx fee
        // await node.transfer('Alice', validatorNode.james.address, trans_amount, 0)     // staking token
        await node.transfer('Alice', validatorNode.james.address, trans_amount, 10)    // spending token
        
        // startup a new validator node 
        const txResult = await startNewValidatorNode( validatorNode.james )
        // judge the result
        assert( txResult == true, `New validator [${validatorNode.james.seed}] failed to join the boot node.`)
        
        // bond
        // await staking.bond(validatorNode.james.seed, bond_amount)
        
        // stake
        await startStaking(stashAccSeed, controllerSeed, bondAmount)
    });

    it.skip('TODO: Staking validator <James> obtains reward', async function() {
        // TODO: reward is not working for the new staking module
        await checkReward(validatorNode.james)
    });

    it('Let richer controller-Eve stake and validator-James will be replaced', async function() {
        this.timeout(120000)

        const stashAccSeed = 'Ferdie'
        const controllerSeed = validatorNode.eve.seed 
        const bondAmount = largeBondAmount
    
        // start up the new node
        await startNewValidatorNode(validatorNode.eve)

        // make controller to stake
        await startStaking(stashAccSeed, controllerSeed, bondAmount)

        // await staking.waitEraChange()

        const stakeId_eve = await staking.queryStakingIndex(validatorNode.eve.seed)
        const stakeId_james = await staking.queryStakingIndex(validatorNode.james.seed)

        assert( stakeId_eve >= 0, `Failed to make richer validator [${validatorNode.eve.seed}] into staking list.`)
        assert( stakeId_james < 0, `Failed to kick validator [${validatorNode.james.seed}] out from staking list.`)
    });

    it('Unstake validator <eve> and validator James came back', async function() {    
        await unstartStaking(validatorNode.eve.seed)

        const stakeId_eve = await staking.queryStakingIndex(validatorNode.eve.seed)
        const stakeId_james = await staking.queryStakingIndex(validatorNode.james.seed)

        assert( stakeId_eve < 0, `Failed to unstake validator [${validatorNode.eve.seed}].`)
        assert( stakeId_james >= 0, `Failed to put validator [${validatorNode.james.seed}] back to staking list.`)
    });

    it('Shutdown one of three validators (Bob), chain is still working', async function() {
        // get block number before drop node
        const preBlockNum = await block.getCurrentBlockNumber()

        // stop the docker container
        docker.dropNode(validatorNode.bob.containerName)

        // await at least 2 blocks
        const currBlockNum = await block.waitBlockCnt(2)

        assert(currBlockNum - preBlockNum >= 2, `Chain did not work well. (Current block id [${currBlockNum}], previous id [${preBlockNum}])`)
    });

    it.skip('Offline validator <Bob> obtains punishment. TODO: When will get the punishment', async function() {

        const validator = validatorNode.bob
        
        // await one era to ensure the valiator is leaving.
        // await staking.waitEraChange()

        const bal_preSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

        await staking.waitSessionChange()

        const bal_afterSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

        // bal_afterSession < bal_preSession,
        assert( BigNumber(bal_preSession).minus(bal_afterSession).gt(0),
                `Validator [${validator.seed}] did not get punishment.(Bal before tx = ${bal_preSession}, Bal after tx = ${bal_afterSession})`)
    });

    it('Two validators left <Alice and James>, shutdown James, chain stop working, and recovery after James is back', async function() {
        const validator = validatorNode.james


        // get last block id
        const preBlockId = await block.waitBlockCnt(0)

        // shutdown node
        docker.dropNode(validator.containerName)

        // sleep 5s and restart validator bob
        await sleep(5000)
        startNewValidatorNode(validator)
        
        // await at least 2 blocks
        const currBlockId = await block.waitBlockCnt(2)
        assert(currBlockId > preBlockId, `Chain did not work well. (Current block id [${currBlockId}], previouse is []${preBlockId})`)

        // check if Bob is in the staking list
        const index = await staking.queryStakingIndex(validatorseed)
        assert(index >= 0, `Validator [${validator.seed}] is not in the staking list.`)
    });

    it('Make validator James unstake', async function() {
        await unstartStaking(validatorNode.james.seed)
    });

});

// make a new validator join newwork
async function startNewValidatorNode( validator ) {

    // check peer count before new node joins in
    const bootApi = await bootNodeApi.getApi()
    const peers_Before = await bootApi.rpc.system.peers()
    const peersCnt_Before = peers_Before.length
    // console.log('peers =', peersCnt_Before)

    // start a new node
    docker.startNewValidator(validator)

    // init the connection to the new node, using 'ws://127.0.0.1:XXXX'
    const newNodeWsIp = bootNodeApi.getWsIp().replace('9944', validator.wsPort)
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

async function startStaking(stashAccSeed, controllerSeed, bondAmount){
    // bond amount first
    await staking.bond(stashAccSeed, controllerSeed, bondAmount)

    // stake
    await staking.stake(controllerSeed)

    // validator will be added in next era
    await staking.waitEraChange()

    // get staker sequence id
    const stakerId = await staking.queryStakingIndex(controllerSeed)

    // check if the validator is in the staker list
    assert( stakerId >= 0, `Failed to make validator [${controllerSeed}] stake.`)

    // await 1 new block
    await block.waitBlockCnt(1)
}

async function unstartStaking(validatorSeed){
    // get staker id before tx
    const stakerId_beforeTx = await staking.queryStakingIndex(validatorSeed)
    assert( stakerId_beforeTx >= 0, `Validator [${validatorSeed}] is not in staking list.`)

    // unstake
    await staking.unstake(validatorSeed)

    // validator will be removed in next era
    await staking.waitEraChange()

    // // get staker id after tx
    const stakerId_AfterTx = await staking.queryStakingIndex(validatorSeed)
    
    // check if the validator is removed from the staker list
    assert( stakerId_AfterTx < 0, `Failed to make validator [${validatorSeed}] unstake.[Actual ID = ${stakerId_AfterTx}]`)
}

// check if any reward is saved into account
async function checkReward2(validator){

    let bRet = false

    // check if the validator is in stake
    const stakerId = await staking.queryStakingIndex(validator.seed)
    assert(stakerId >= 0, `Validator (${validator.seed}) is not in staking list.`)

    const containerId = docker.queryNodeContainer(validator.containerName)
    assert(containerId.length > 0, `Container node (${validator.containerName}) is not existing.`)

    const bal_preSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

    await staking.waitSessionChange()

    const bal_afterSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

    assert(BigNumber(bal_afterSession).minus(bal_preSession).gt(0),
        `Validator [${validator.seed}] did not get reward.(Bal before tx = ${bal_preSession}, Bal after tx = ${bal_afterSession})`)

    bRet = true
    return bRet
}

async function checkReward(validator){

    let bRet = false

    const api = await bootNodeApi.getApi()

    const staker = await api.query.staking.stakers(validator.address)
    console.log('total =', staker.total.toString())
    console.log('own =', staker.own.toString())

    // check if the validator is in stake
    const stakerId = await staking.queryStakingIndex(validator.seed)
    assert(stakerId >= 0, `Validator (${validator.seed}) is not in staking list.`)

    const containerId = docker.queryNodeContainer(validator.containerName)
    assert(containerId.length > 0, `Container node (${validator.containerName}) is not existing.`)

    const bal_preSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

    await staking.waitSessionChange()

    const bal_afterSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

    assert(BigNumber(bal_afterSession).minus(bal_preSession).gt(0),
        `Validator [${validator.seed}] did not get reward.(Bal before tx = ${bal_preSession}, Bal after tx = ${bal_afterSession})`)

    bRet = true
    return bRet
}
