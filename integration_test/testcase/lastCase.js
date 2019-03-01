
"use strict";

const assert = require('assert')
const block = require('../../api/block')

const totalWaitBlockCnt = 50

describe(`Waiting for ${totalWaitBlockCnt} blocks ...`, function () {
    
    before(async function(){
    })

    after(function(){
    })
    
    it(`Node could produce at least ${totalWaitBlockCnt} blocks`, async function() {
        this.timeout(600000)
        
        let currBlockId = await block.waitBlockId(totalWaitBlockCnt)
        assert( currBlockId >= totalWaitBlockCnt - 1, `Node should generate more than ${totalWaitBlockCnt} blocks, but current Block Id is ${currBlockId}`)
    });
});