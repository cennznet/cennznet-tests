
"use strict";

const assert = require('assert')
const node = require('../../api/node')
const {bootNodeApi} = require('../../api/websocket')


describe('Boot Node test cases', function () {
    
    before(async function(){
        this.timeout(10000)
        // init websocket api
        await bootNodeApi.init()
    })

    after(function(){
        // close websocket
        bootNodeApi.close()

    })
    
    it('The Boot Node is able to produce new blocks', async function() {
        this.timeout(60000)
        
        let aimBlockCnt = 5
        let currBlockId = await node.awaitBlockCnt(aimBlockCnt)
        assert( currBlockId >= aimBlockCnt - 1, `Node should generate more than ${aimBlockCnt} blocks, but current Block Id is ${currBlockId}`)
    });

});