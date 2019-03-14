
"use strict";

const assert = require('assert')
const block = require('../../api/block')


describe.skip('Boot Node test cases', function () {

    it('The Boot Node is able to produce new blocks', async function() {
        this.timeout(60000)
        
        let aimBlockCnt = 5
        let currBlockId = await block.waitBlockCnt(aimBlockCnt)
        assert( currBlockId >= aimBlockCnt - 1, `Node should generate more than ${aimBlockCnt} blocks, but current Block Id is ${currBlockId}`)
    });
});