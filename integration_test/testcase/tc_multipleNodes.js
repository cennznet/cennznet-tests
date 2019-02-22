
"use strict";

const assert = require('assert')
const node = require('../../api/node')
const {sleep} = require('../../api/util')
const {bootNodeApi, WsApi} = require('../../api/websocket')
const shell = require('shelljs');
const staking = require('../../api/staking')

const containerName1 = 'integration_test_node1'
const containerName2 = 'integration_test_node2'

describe('Multiple Nodes test cases ...', function () {
    
    before(async function(){
        // init websocket api
        // await bootNodeApi.init()
    })

    after(function(){
        bootNodeApi.close()
    })
    
    it('New validator node joins in and sync blocks', async function() {
        this.timeout(60000)

        const validator = 'James'
        const htmlPort = '30334'
        const wsPort = '9945'

        // check peer count before new node joins in
        const bootApi = await bootNodeApi.getApi()
        const peersCnt_Before = await bootApi.rpc.system.peers()
        console.log(peersCnt_Before.length)

        // Join a new node
        node.joinNewValidator(containerName1, validator, htmlPort, wsPort)

        // init the connection to the new node, using 'ws://127.0.0.1:9945'
        const newNodeWsIp = bootNodeApi.getWsIp().replace('9944', wsPort)
        const newNodeApi = new WsApi(newNodeWsIp)
        await newNodeApi.init()

        // await at least 5 blocks
        await node.awaitBlock(5, newNodeApi)
        
        // wait for the peer count change
        const txResult = await new Promise(async (resolve, reject) => {
           await bootApi.rpc.system.peers((peers) => {
               let currentPeerCnt = peers.length
               console.log(currentPeerCnt)
                // console.log('type =', type)
                if (currentPeerCnt != peersCnt_Before ) {
                    resolve(true)
                }
            }).catch((error) => {
                reject(error)
            });
        });

        // judge the peer count
        assert( txResult == true, `New validator [${validator}] did not join the boot node.`)

        // close the api
        newNodeApi.close()
    });

    it('TODO: Make validator to stake', async function() {
        this.timeout(60000)
        const seed = 'James'
        await node.transfer('Alice', '5GcKi8sUm91QpzaVn3zpD8HkUNT7vEF1HgyAW1t9X1ke7afj', 1000000000000000000000000, 0)
        await node.transfer('Alice', '5GcKi8sUm91QpzaVn3zpD8HkUNT7vEF1HgyAW1t9X1ke7afj', 1000000000000000000000000, 10)
        await staking.stake(seed)

        // get staker sequence id
        let stakerId = -1
        for ( let i = 0; i < 60; i++ ){
            stakerId = await staking.queryStakerIndex(seed)
            console.log('stakerId =', stakerId)
            if ( stakerId >= 0 ){
                break
            }
            await sleep(500)
        }
        
        assert( stakerId >= 0, `Failed to make validator [${seed}] to stake`)
    });

    it.skip('TODO: Make validator to unstake', async function() {

    });
});