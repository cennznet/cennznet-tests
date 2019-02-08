
"use strict";

const assert = require('assert')
const node = require('../../api/bootNode')
const {sleep} = require('../../api/util')
const {bootNodeApi, WsApi} = require('../../api/websocket')


describe('New node joins in ...', function () {
    
    before(async function(){
        // init websocket api
        await bootNodeApi.init()
    })

    after(function(){
        bootNodeApi.close()
    })
    
    it('New node joins the network and sync blocks', async function() {
        this.timeout(60000)

        let bGetSameBlock = false

        // Join a new node
        node.joinNewNode()
        await sleep(5000)

        // init the connection to the new node
        const newNodeWsIp = 'ws://127.0.0.1:9945'
        const newNodeApi = new WsApi(newNodeWsIp)
        await newNodeApi.init()

        // await at least 5 blocks
        await node.awaitBlock(5, newNodeApi)

        // compare block info until two nodes have same blocks
        for (let i = 0; i < 100; i++ ){
            // get head
            let header1 = await node.queryLastBlock(bootNodeApi)
            let header2 = await node.queryLastBlock(newNodeApi)
            // get block number and parent block hash
            let blockNo1 = parseInt(header1.blockNumber.toString())
            let parentHash1 = header1.parentHash.toString()
            let blockNo2 = parseInt(header2.blockNumber.toString())
            let parentHash2 = header2.parentHash.toString()

            // check if they are same blocks
            if ( blockNo1 == blockNo2 && parentHash1 === parentHash2){
                // console.log(`Got ${sameBlockCnt} sync blocks`)
                bGetSameBlock = true
                break
            }

            // sleep 4s for next check.
            await sleep(4000)
        }

        // judge the result
        assert( bGetSameBlock == true, `Did not get same block in 1 minute.`)

        // close the api
        newNodeApi.close()
    });

});