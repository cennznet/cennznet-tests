
const { bootNodeApi } = require('./websocket')
const node = require('./node')
const { GenericAsset } = require('@cennznet/generic-asset');
const { AssetId } = require('@cennznet/types');



async function initGA(seed, nodeApi = bootNodeApi){

    const api = await nodeApi.getApi()
    await node.setApiSigner(api, seed)
    // Create GA
    const ga = await GenericAsset.create(api)

    return ga
}

module.exports.createNewToken = async function (ownerSeed, totalAmount, permission, nodeApi = bootNodeApi){

    const assetOwner = node.getAccount(ownerSeed)

    const api = await nodeApi.getApi()
    
    await node.setApiSigner(api, ownerSeed)

    const nonce = await node.getNonce(assetOwner.address())

    // Create GA
    const ga = await GenericAsset.create(api)

    const txResult = await new Promise(async (resolve,reject) => {
        const trans = ga.create({initialIssuance: totalAmount, permissions: permission})
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

module.exports.updatePermission = async function (traderSeed, assetId, newPermission, nodeApi = bootNodeApi){

    // Create GA
    const ga = await initGA(traderSeed, nodeApi)

    const tx = ga.api.tx.genericAsset.updatePermission(assetId, newPermission)

    const txResult = await node.signAndSendTx(tx, traderSeed)

    return txResult
}

module.exports.burn = async function (traderSeed, assetId, toSeed, amount, nodeApi = bootNodeApi){

    // Create GA
    const ga = await initGA(traderSeed, nodeApi)

    const tx = ga.api.tx.genericAsset.burn(assetId, node.getAddressFromSeed(toSeed), amount)

    const txResult = await node.signAndSendTx(tx, traderSeed)

    return txResult
}

module.exports.mint = async function (traderSeed, assetId, toSeed, amount, nodeApi = bootNodeApi){

    // Create GA
    const ga = await initGA(traderSeed, nodeApi)

    const tx = ga.api.tx.genericAsset.mint(assetId, node.getAddressFromSeed(toSeed), amount)

    const txResult = await node.signAndSendTx(tx, traderSeed)

    return txResult
}

module.exports.queryTokenBalance = async function (assetId, assetOwnerSeed, nodeApi = bootNodeApi){

    const assetOwner = node.getAccount(assetOwnerSeed)

    const api = await nodeApi.getApi()
    
    await node.setApiSigner(api, assetOwnerSeed)

    const ga = await GenericAsset.create(api)

    const balance = await ga.getFreeBalance(assetId, assetOwner.address());

    return balance.toString()
}

module.exports.getPermissionAddress = function (permissionSeed){

    // copy the object
    let permissionAddress = Object.assign({}, permissionSeed) 

    permissionAddress.update = node.getAddressFromSeed(permissionSeed.update)
    permissionAddress.mint = node.getAddressFromSeed(permissionSeed.mint)
    permissionAddress.burn = node.getAddressFromSeed(permissionSeed.burn)

    return permissionAddress
}


