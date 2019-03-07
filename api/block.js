
const { bootNodeApi } = require('./websocket');
const { sleep } = require('./util');

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

// await specified block number
module.exports.awaitBlockCnt = async function ( blockNum, nodeApi = bootNodeApi) {

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
            if (currblockCnt >= blockNum){
                resolve(blockNo)
            }
        }).catch((error) => {
            reject(error);
        });
    });

    // unsubscribe...
    if (blockNum > 0){
        unsubscribe()
    }
        
    return currBlockId
}