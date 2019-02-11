
"use strict";

const assert = require('assert')
const node = require('../../api/node')
const {bootNodeApi} = require('../../api/websocket')


describe('Waiting for 50 blocks', function () {
    
    before(async function(){
        await bootNodeApi.init()
    })

    after(function(){
        bootNodeApi.close()
    })
    
    it('Node could generate 50 blocks', async function() {
        this.timeout(600000)
        
        let aimBlockId = 50
        let currBlockId = await node.awaitBlock(aimBlockId)
        assert( currBlockId >= aimBlockId, `Node should generate more than ${aimBlockId + 1} blocks, but current Block Id is ${currBlockId}`)
    });
});