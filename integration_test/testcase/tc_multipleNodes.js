
"use strict";

const assert = require('assert')
const node = require('../../api/node')
const {sleep} = require('../../api/util')
const {bootNodeApi, WsApi} = require('../../api/websocket')
const shell = require('shelljs');
const staking = require('../../api/staking')
const BigNumber = require('big-number');


const validatorNode = {
    bob: {
        containerName: 'integration_test_node1',
        htmlPort: '30334',
        wsPort: '9945',
        seed: 'Bob',
        address: '5Gw3s7q4QLkSWwknsiPtjujPv3XM4Trxi5d4PgKMMk3gfGTE',
    },
    james: {
        containerName: 'integration_test_node2',
        htmlPort: '30335',
        wsPort: '9946',
        seed: 'James',
        address: '5GcKi8sUm91QpzaVn3zpD8HkUNT7vEF1HgyAW1t9X1ke7afj',
    }
}



describe('Multiple Nodes test cases ...', function () {
    
    before(async function(){
        // init websocket api
        // await bootNodeApi.init()
    })

    after(function(){
        // bootNodeApi.close()
    })

    it('New validator node(Bob) joins in', async function() {
        this.timeout(60000)

        // startup a new validator node 
        const txResult = await joinNewValidator( validatorNode.bob )
        // judge the peer count
        assert( txResult == true, `New validator [${validatorNode.bob.seed}] failed to join the boot node.`)
    });

    it('Make validator Bob begin to stake', async function() {
        this.timeout(60000)

        // stake
        await staking.stake(validatorNode.bob.seed)

        // validator will be added in next era
        await staking.waitEraChange()

        // get staker sequence id
        const stakerId = await staking.queryStakerIndex(validatorNode.bob.seed)
        
        // check if the validator is in the staker list
        assert( stakerId >= 0, `Failed to make validator [${validatorNode.bob.seed}] stake.`)
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

        // await sleep(10000)
        // await node.awaitBlock(5)

        // stake
        await staking.stake(validatorNode.james.seed)

        // validator will be added in next era
        await staking.waitEraChange()

        // get staker sequence id
        const stakerId = await staking.queryStakerIndex(validatorNode.james.seed)
        
        // check if the validator is in the staker list
        assert( stakerId >= 0, `Failed to make validator [${validatorNode.james.seed}] stake.`)
    
    });

    it('Staking validator (James) obtains reward', async function() {
        this.timeout(60000)
    
        const validator = validatorNode.james

        // check if the container node is existing
        const containerId = node.queryNodeContainer(validator.containerName)
        assert( containerId.length > 0, `Container node (${validator.containerName}) is not existing.`)
        
        const bal_preSession = await node.queryFreeBalance(validator.address, node.currency.CENNZ)
    
        await staking.waitSessionChange()
    
        const bal_afterSession = await node.queryFreeBalance(validator.address, node.currency.CENNZ)
    
        assert( BigNumber(bal_afterSession).minus(bal_preSession).gt(0),
                `Validator [${validator.seed}] did not get reward.(Bal before tx = ${bal_preSession}, Bal after tx = ${bal_afterSession})`)
    });

    it('One of three validators drops off, chain is still working', async function() {
        this.timeout(60000)
        
        // stop the docker container
        node.dropNode(validatorNode.james.containerName)

        const lastBlockHeader = await node.queryLastBlock()
        const lastBlockNum = parseInt(lastBlockHeader.blockNumber.toString())
        // await at least 5 blocks
        const currBlockNum = await node.awaitBlock(5)

        assert(currBlockNum - lastBlockNum >= 5, `Chain did not work well. (Last valid block id [${lastBlockNum}], current block id [${currBlockNum}])`)
    });

    it('Offline validator (James) obtains punishment', async function() {
        this.timeout(60000)

        const validator = validatorNode.james
        
        // await one era to ensure the valiator is leaving.
        // await staking.waitEraChange()

        const bal_preSession = await node.queryFreeBalance(validator.address, node.currency.CENNZ)

        await staking.waitSessionChange()

        const bal_afterSession = await node.queryFreeBalance(validator.address, node.currency.CENNZ)

        // bal_afterSession < bal_preSession,
        assert( BigNumber(bal_preSession).minus(bal_afterSession).gt(0),
                `Validator [${validator.seed}] did not get punishment.(Bal before tx = ${bal_preSession}, Bal after tx = ${bal_afterSession})`)
    });

    it.skip('Make validator Bob unstake', async function() {
        this.timeout(60000)

        // get staker id before tx
        const stakerId_beforeTx = await staking.queryStakerIndex(validatorNode.bob.seed)
        assert( stakerId_beforeTx >= 0, `Validator [${validatorNode.bob.seed}] is not in staker list.`)

        // unstake
        await staking.unstake(validatorNode.bob.seed)

        // validator will be removed in next era
        await staking.waitEraChange()

        // get staker id after tx
        const stakerId_AfterTx = await staking.queryStakerIndex(validatorNode.bob.seed)
        
        // check if the validator is removed from the staker list
        assert( stakerId_AfterTx < 0, `Failed to make validator [${validatorNode.bob.seed}] unstake.[Actual ID = ${stakerId_AfterTx}]`)
    });

    it.skip('TODO: Make validator James(New account) unstake', async function() {
        this.timeout(60000)

        const seed = 'James'
        let stakerId = 0

        const stakerId_beforeTx = await staking.queryStakerIndex(seed)
        assert( stakerId_beforeTx >= 0, `Validator [${seed}] is not in staker list.`)

        // unstake
        await staking.unstake(seed)

        // get staker sequence id, wait for it changed
        for ( let i = 0; i < 60; i++ ){
            stakerId = await staking.queryStakerIndex(seed)
            console.log('stakerId =', stakerId)
            if ( stakerId < 0 ){
                break
            }
            await sleep(500)
        }
        
        // check if the validator is removed from the staker list
        assert( stakerId < 0, `Failed to make validator [${seed}] unstake.`)
    });

});


async function joinNewValidator( validator ) {

    // check peer count before new node joins in
    const bootApi = await bootNodeApi.getApi()
    const peers_Before = await bootApi.rpc.system.peers()
    const peersCnt_Before = peers_Before.length
    // console.log('peers =', peersCnt_Before)

    // start a new node
    node.startNewValidator(validator.containerName, validator.seed, validator.htmlPort, validator.wsPort)

    // init the connection to the new node, using 'ws://127.0.0.1:XXXX'
    const newNodeWsIp = bootNodeApi.getWsIp().replace('9944', validator.wsPort)
    // console.log('newNodeWsIp =', newNodeWsIp)
    const newNodeApi = new WsApi(newNodeWsIp)
    await newNodeApi.init()

    // await at least 5 blocks
    await node.awaitBlock(5, newNodeApi)
    
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