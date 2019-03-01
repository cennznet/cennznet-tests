
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
