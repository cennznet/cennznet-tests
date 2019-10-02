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


module.exports.setClaim = async function(issuerAccount, holderAccount, topic, value, nodeApi = bootNodeApi){ // issuer, holder : KeyringPair type
    // get api
    const api = await nodeApi.getApi()

    const trans = api.tx.attestation.setClaim(holderAccount.address, topic, value)

    const txResult = await node.signAndSendTx(trans, issuerAccount)

    return txResult
}


module.exports.removeClaim = async function(issuerAccount, holderAccount, topic, nodeApi = bootNodeApi){
    // get api
    const api = await nodeApi.getApi()

    const trans = api.tx.attestation.removeClaim(holderAccount.address, topic)

    const txResult = await node.signAndSendTx(trans, issuerAccount)

    return txResult
}

module.exports.getClaim = async function(holderAddress, issuerAddress, topic, nodeApi = bootNodeApi) {
    let api = await nodeApi.getApi()
    let claim = await api.query.attestation.values([holderAddress, issuerAddress, topic]);
    return claim.toString();
}