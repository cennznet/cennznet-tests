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

const { bootNodeApi } = require('./websocket');
const { sleep } = require('./util');

// Wait until the specified block appears
module.exports.waitBlockId = async function(blockId, nodeApi = bootNodeApi){
    const api = await nodeApi.getApi()
    let blockHash = ''

    // wait for the block hash
    for( let i = 0; i < 10000; i++ ){
        blockHash = await api.rpc.chain.getBlockHash(blockId)

        if ( blockHash.toString().replace('0x','') == '' ){
            await sleep(1000)
        }
        else{
            break
        }
    }

    return blockHash
}

// Wait until specified count of blocks generated
module.exports.waitBlockCnt = async function ( blockNum, nodeApi = bootNodeApi) {

    const api = await nodeApi.getApi()

    let unsubscribe = null

    // listening to the new block
    const currBlockId = await new Promise(async (resolve,reject) => {
        let currblockCnt = 0
        unsubscribe = await api.rpc.chain.subscribeNewHead(async (header) => {
            // console.log('blockNumber...', header.blockNumber.toString())
            currblockCnt++
            let blockNo = parseInt(header.blockNumber.toString())
            // if (blockNo >= blockId){
            if (currblockCnt >= blockNum + 1){ // the first block is current block, so the number should add 1 more.
                resolve(blockNo)
            }
        }).catch((error) => {
            reject(error);
        });
    });

    // unsubscribe...
    try{
        if (blockNum > 0){
            unsubscribe()
        }
    }
    catch(e){
        throw Error('Unsubscribe head info failed. Maybe the node is not existing.')
    }
        
    return currBlockId
}


module.exports.getCurrentBlockIndex = async function (nodeApi = bootNodeApi) {
    return await this.waitBlockCnt(0)
}