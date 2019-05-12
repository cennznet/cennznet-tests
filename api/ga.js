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


