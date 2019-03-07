
const { bootNodeApi } = require('./websocket')
const { getAccount, setApiSigner, getNonce } = require('./node')
const { GenericAsset } = require('cennznet-generic-asset');
const { AssetId } = require('cennznet-runtime-types');

module.exports.createNewToken = async function (ownerSeed, totalAmount, nodeApi = bootNodeApi){

    const assetOwner = getAccount(ownerSeed)

    const api = await nodeApi.getApi()
    
    await setApiSigner(api, ownerSeed)

    const nonce = await getNonce(assetOwner.address())

    // Create GA
    const ga = new GenericAsset(api)

    const txResult = await new Promise(async (resolve,reject) => {
        const trans = ga.create({totalSupply: totalAmount})
        const txLen  = trans.sign(assetOwner, nonce).encodedLength;

        await trans.send( async (status) => {
            // wait for tx finalised
            if (status.type === 'Finalised' && status.events !== undefined) {
                let isCreated = false
                // wait for 'Created' event
                for(let i = 0; i < status.events.length; i++) {
                    const event = status.events[i];
                    // console.log('event = ', event.event.method.toString())
                    if (event.event.method === 'Created') {
                        isCreated = true;
                        const _assetId = new AssetId(event.event.data[0]);
                        const result = {assetId: _assetId, txLength: txLen}
                        // console.log('assetId =', assetId.toString())
                        resolve( result )
                        /* query balance
                        const balance = await ga.getFreeBalance(assetId, assetOwner.address());
                        console.log('balance =',balance.toString())*/
                    }
                }
                if (isCreated != true){
                    reject('Created token failed.');
                }
            }
        }).catch((error) => {
            reject(error);
        });
    })

    return txResult
}


module.exports.queryTokenBalance = async function (assetId, assetOwnerSeed, nodeApi = bootNodeApi){

    const assetOwner = getAccount(assetOwnerSeed)

    const api = await nodeApi.getApi()
    
    await setApiSigner(api, assetOwnerSeed)

    const ga = new GenericAsset(api)

    const balance = await ga.getFreeBalance(assetId, assetOwner.address());
    
    // console.log('balance =',balance.toString())
    return balance.toString()
}



