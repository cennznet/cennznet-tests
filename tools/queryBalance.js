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

const node = require('../api/node');
const { bootNodeApi } = require('../api/websocket');


// const nodeServerWsIp = 'ws://cennznet-node-1.centrality.me:9944';
var address = "";
var assetId = 0;

async function getArgs()
{
    const argv = require('yargs').argv;
    argv.ws ? await bootNodeApi.setWsIp(argv.ws) : await bootNodeApi.setWsIp('ws://127.0.0.1:9944');
    address = argv.a
    argv.i ? assetId = argv.i : assetId = 0
}


async function run() {

    await getArgs()
    let bal = await node.queryFreeBalance(address, assetId)
    console.log('bal =', bal)
    console.log('address = ', node.getAddressFromSeed(address))
    process.exit()
}


run()

/*  run cmd:
    1. local:   
        node tools/queryBalance -a Alice -i 16000 --ws ws://127.0.0.1:9944
*/

