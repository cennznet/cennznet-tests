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
const { bootNodeApi } = require('../api/websocket');


async function getArgs()
{
    const argv = require('yargs').argv;
    
    argv.ws ? await bootNodeApi.setWsIp(argv.ws) : await bootNodeApi.setWsIp('ws://127.0.0.1:9944');
    fromSeed = argv.f
    toAddr = argv.t
    argv.a ? amount = parseInt(argv.a) : amount = 1000;
    argv.i ? assetId = argv.i : assetId = 0 // default asset is Cennz
}

// test code
async function send(fromSeed, toAddr, amount, asset = assetId) {

    let toAddress = toAddr

    let bal1 = await node.queryFreeBalance(toAddress, asset);
    console.log('bal1 before = ', bal1.toString())

    console.log('fromSeed = ', fromSeed.toString())
    console.log('toAddress = ', toAddress.toString())
    console.log('amount = ', amount.toString())
    console.log('asset = ', asset.toString())
    let result = await node.transfer(fromSeed, toAddress, amount, asset);
    // console.log('result = ', result)

    let bal2 = await node.queryFreeBalance(toAddress, asset);
    console.log('bal2 after = ', bal2.toString())

    // let fee = await require('../api/fee').queryTxFee2(result.txHash)
    // console.log('fee = ', fee.toString())

    process.exit()
}

async function run()
{
    await getArgs()
    send(fromSeed, toAddr, amount)
}

var fromSeed = ""
var toAddr = ""
var amount = ""
var assetId = 0

run()

// module.exports.send = send

/*
// run code:
       node tools/sendOneTx -f Alice -t Monkey -a 1000000 -i 16000 --ws ws://127.0.0.1:9944
       node tools/sendOneTx -f Andrea -t James -a 100000 -i 16001 --ws wss://cennznet-node-0.centrality.cloud:9944
*/