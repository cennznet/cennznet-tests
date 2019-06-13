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

const node = require('../api/node')
const GA = require('../api/ga')
const ws = require('../api/websocket')
const BN = require('bignumber.js')
const { cryptoWaitReady } = require('@cennznet/util');

var nodeServerWsIp = "";
var seed = "";
var assetId = 16000

function getArgs()
{
    const argv = require('yargs').argv;
    argv.ws ? nodeServerWsIp = argv.ws : nodeServerWsIp = 'ws://127.0.0.1:9944';
    seed = argv.s
    argv.a ? assetId = argv.a : assetId = 16000
}

async function listenBalChange(seed) {

    let previous = await node.queryFreeBalance(seed, assetId)
    console.log(`${seed} Bal = ${previous}`);

    const api = new ws.WsApi(nodeServerWsIp)
    const ga = await GA.initGA(seed, api)
    await ga.getFreeBalance(assetId, await node.getAddressFromSeed(seed), (current) => {
        if (current == null || current <= 0 ){
            console.log('null or 0 balance, continue...', current.toString())
            return;
        }

        // Only display positive value changes (Since we are pulling `previous` above already,
        // the initial balance change will also be zero)
        if ( current.toString() === previous.toString() ) {
            console.log('Same Bal as before, continue...')
            return;
        }

        previous = current

        console.log(`${seed} Balance changed: Now = ${current.toString()}`);
    });

}


async function test() {

    await cryptoWaitReady()
    getArgs()
    await listenBalChange(seed)
}


test()

/*  run cmd:
        node tools/listenBalChange -s Alice -a 16000 --ws ws://127.0.0.1:9944
*/

