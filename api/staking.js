
const { getNonce, getAccount } = require('./node')
const { bootNodeApi } = require('./websocket');

module.exports.stake = async function(stakerSeed, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()
    
    // get staker account
    const stakerAccount = getAccount(stakerSeed)
    
    // get valid nonce
    const nonce = await getNonce(stakerAccount.address());

    // set a claim
    const txResult = await new Promise(async (resolve, reject) => {
        const trans = api.tx.staking.stake()
        const txLen = trans.sign(stakerAccount, nonce).encodedLength

        await trans.send(({ events = [], status, type }) => {
            // console.log('type =', type)
            if (type == 'Finalised') {
                const _hash = status.raw.toString() // get hash
                const result = {hash: _hash, txLength: txLen}

                resolve(result)
            }
        }).catch((error) => {
            reject(error)
        });
    });

    return txResult
}

module.exports.unstake = async function(stakerSeed, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()

    // get staker account
    const stakerAccount = getAccount(stakerSeed)

    // get valid nonce
    const nonce = await getNonce(stakerAccount.address());

    // get Intention Index
    const intentionIndex = await queryStakerIndex(stakerSeed, nodeApi)

    // set a claim
    const txResult = await new Promise(async (resolve, reject) => {
        const trans = api.tx.staking.unstake(intentionIndex)
        const txLen = trans.sign(stakerAccount, nonce).encodedLength

        await trans.send(({ events = [], status, type }) => {
            if (type == 'Finalised') {
                const _hash = status.raw.toString() // get hash
                const result = {hash: _hash, txLength: txLen}

                resolve(result)
            }
        }).catch((error) => {
            reject(error)
        });
    });

    return txResult
}

module.exports.queryStakerIndex = async function(stakerSeed, nodeApi = bootNodeApi){ 
    let index = -1;

    // get api
    const api = await nodeApi.getApi()

    const stakerAddress = getAccount(stakerSeed).address()

    // get validator address list
    const stakerList = await api.query.session.validators()

    // get the address id of array
    for (let i = 0; i < stakerList.length; i++ ){
        if ( stakerList[i].toString() == stakerAddress ){
            index = i
        }
    }

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