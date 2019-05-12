// Copyright 2019 Centrality Investments Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

const assert = require('assert')
const block = require('../../api/block')


describe('Boot Node test cases', function () {

    it('The Boot Node is able to produce new blocks', async function() {
        const aimBlockCnt = 2
        const currBlockId = await block.waitBlockCnt(aimBlockCnt)
        assert( currBlockId >= aimBlockCnt - 1, `Node should generate more than ${aimBlockCnt} blocks, but current Block Id is ${currBlockId}`)
    });
});