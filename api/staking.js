
const node = require('./node')
const { bootNodeApi } = require('./websocket');

module.exports.stake = async function(stakerSeed, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()
    
    // make the tx
    const trans = api.tx.staking.stake()

    // stake the validator
    const txResult = await node.signAndSendTx(trans, stakerSeed)

    return txResult
}

module.exports.unstake = async function(stakerSeed, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()

    // get Intention Index
    const intentionIndex = await this.queryIntentionIndex(stakerSeed, nodeApi)
    
    // make the tx
    const trans = api.tx.staking.unstake(intentionIndex)

    // unstake the validator
    const txResult = await node.signAndSendTx(trans, stakerSeed)

    return txResult
}

module.exports.queryIntentionIndex = async function(stakerSeed, nodeApi = bootNodeApi){ 
    let index = -1;

    // get api
    const api = await nodeApi.getApi()

    const stakerAddress = node.getAccount(stakerSeed).address()

    // get intentions list
    const intentionList = await api.query.staking.intentions()

    // get the intention index
    index = intentionList.indexOf(stakerAddress)
    
    return index
}

module.exports.queryStakingIndex = async function(stakerSeed, nodeApi = bootNodeApi){ 
    let index = -1;

    // get api
    const api = await nodeApi.getApi()

    const stakerAddress = node.getAccount(stakerSeed).address()

    // get intentions list
    const stakerList = await api.query.session.validators()

    // get the intention index
    index = stakerList.indexOf(stakerAddress)
    
    return index
}

module.exports.waitSessionChange = async function(nodeApi = bootNodeApi){
    // get api
    const api = await nodeApi.getApi()

    // get current session
    const previouseSessionId = (await api.query.session.currentIndex()).toString()

    // listen to new session
    const newSessionId = await new Promise(async (resolve, reject) => { 
        api.query.session.currentIndex((session) => {
            let currentSessionId = session.toString()
            if ( currentSessionId > previouseSessionId ){
                resolve(currentSessionId)
            }
        }).catch((error) => {
            reject(error)
        });
    })

    // console.log('sessionIndex =',sessionIndex.toString())

    return newSessionId
}

module.exports.waitEraChange = async function(nodeApi = bootNodeApi){
    // get api
    const api = await nodeApi.getApi()

    // get current session
    const previouseEraId = (await api.query.staking.currentEra()).toString()

    // listen to new session
    const newEraId = await new Promise(async (resolve, reject) => { 
        api.query.staking.currentEra((era) => {
            let currentEraId = era.toString()
            // console.log('currentEraId =',currentEraId)
            if ( currentEraId > previouseEraId ){
                resolve(currentEraId)
            }
        }).catch((error) => {
            reject(error)
        });
    })

    // console.log('sessionIndex =',sessionIndex.toString())

    return newEraId
}