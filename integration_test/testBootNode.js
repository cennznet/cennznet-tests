
"use strict";

const assert = require('assert')
const node = require('../api/bootNode')
const {sleep} = require('../api/util')
const {bootNodeApi} = require('../api/websocket')


describe('Boot Node test cases', function () {
    
    before(async function(){
        
        // init websocket api
        await bootNodeApi.init()
    })

    after(function(){
        this.timeout(60000)
        // remove all containers
        node.removeNodeContainers()
        // close websocket
        bootNodeApi.close()
    })
    
    it('The node should be able to generate new blocks', async function() {
        this.timeout(60000)
        
        let aimBlockId = 5
        let currBlockId = await node.awaitBlock(aimBlockId)
        assert( currBlockId >= aimBlockId, `Node should generate more than ${aimBlockId + 1} blocks, but current Block Id is ${currBlockId}`)
    });

});