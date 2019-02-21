
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
        // const trans = api.tx.attestation.setClaim(holder.address(), topic, value)
        const trans = api.tx.staking.stake()
        const txLen = trans.sign(stakerAccount, nonce).encodedLength
        // console.log('len =', txLen)
        await trans.send(({ events = [], status, type }) => {
            if (type == 'Finalised') {
                console.log('status =', status)
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
    const intentionIndex = await queryIntentionIndex(stakerSeed, nodeApi)

    // set a claim
    const txResult = await new Promise(async (resolve, reject) => {
        // const trans = api.tx.attestation.setClaim(holder.address(), topic, value)
        const trans = api.tx.staking.unstake(intentionIndex)
        const txLen = trans.sign(stakerAccount, nonce).encodedLength
        // console.log('len =', txLen)
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

async function queryIntentionIndex(stakerSeed, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()

    const stakerAddress = getAccount(stakerSeed).address()

    // get validator address list
    const stakerList = await api.query.session.validators()

    let intentionIndex = -1;

    // get the address id of array
    for (let i = 0; i < stakerList.length; i++ ){
        if ( stakerList[i].toString() == stakerAddress ){
            intentionIndex = i
        }
    }

    return intentionIndex
}