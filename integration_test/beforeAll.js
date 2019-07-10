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

/**
 * Prepare things before all tests.
 * Note:
 *      @ This file is configed in the 'scripts' section of package.json
 */

"use strict";

const { cryptoWaitReady } = require('@cennznet/util');
const { bootNodeApi } = require('../api/websocket')
const node = require('../api/node')
const args = require('../api/args')

before( async () => {
    // init api
    await bootNodeApi.init()

    // init for simplyKeyring()
    await cryptoWaitReady()

    // top up account for rimu or kauri test
    await node.topupTestAccount()

    // set config for local test
    await node.setNodeConfig()
})