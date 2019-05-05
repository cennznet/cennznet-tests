
const { bootNodeApi } = require('./websocket')
const node = require('./node')
const { GenericAsset } = require('@cennznet/crml-generic-asset');
const { AssetId } = require('@cennznet/types');



module.exports.initGA = async function (seed, nodeApi = bootNodeApi) {

    const api = await nodeApi.getApi()
    await node.setApiSigner(api, seed)
    // Create GA
    const ga = await GenericAsset.create(api)

    return ga
}

module.exports.createNewToken = async function (ownerSeed, totalAmount, permission, nodeApi = bootNodeApi) {

    let assetId = -1

    // Create GA
    const ga = await this.initGA(ownerSeed, nodeApi)

    // create transaction
    const tx = ga.create({ initialIssuance: totalAmount, permissions: permission })

    // send tx
    const txResult = await node.signAndSendTx(tx, ownerSeed)

    // get the asset id
    for (let i = 0; i < txResult.events.length; i++) {
        const event = txResult.events[i];
        if (event.event.method === 'Created') {
            assetId = (new AssetId(event.event.data[0])).toString();
            break;
        }
    }

    return {assetId: assetId, txFee: txResult.txFee}
}

module.exports.updatePermission = async function (traderSeed, assetId, newPermission, nodeApi = bootNodeApi) {

    // Create GA
    const ga = await this.initGA(traderSeed, nodeApi)

    // TODO: change to ga method, not api method
    const tx = ga.api.tx.genericAsset.updatePermission(assetId, newPermission)

    const txResult = await node.signAndSendTx(tx, traderSeed)

    return txResult
}

module.exports.burn = async function (traderSeed, assetId, toSeed, amount, nodeApi = bootNodeApi) {

    // Create GA
    const ga = await this.initGA(traderSeed, nodeApi)

    // TODO: change to ga method, not api method
    const tx = ga.api.tx.genericAsset.burn(assetId, node.getAddressFromSeed(toSeed), amount)

    const txResult = await node.signAndSendTx(tx, traderSeed)

    return txResult
}

module.exports.mint = async function (traderSeed, assetId, toSeed, amount, nodeApi = bootNodeApi) {

    // Create GA
    const ga = await this.initGA(traderSeed, nodeApi)

    // TODO: change to ga method, not api method
    const tx = ga.api.tx.genericAsset.mint(assetId, node.getAddressFromSeed(toSeed), amount)

    const txResult = await node.signAndSendTx(tx, traderSeed)

    return txResult
}

module.exports.getPermissionAddress = async function (permissionSeed) {

    // copy the object
    let permissionAddress = Object.assign({}, permissionSeed)

    permissionAddress.update = node.getAddressFromSeed(permissionSeed.update)
    permissionAddress.mint = node.getAddressFromSeed(permissionSeed.mint)
    permissionAddress.burn = node.getAddressFromSeed(permissionSeed.burn)

    return permissionAddress
}


