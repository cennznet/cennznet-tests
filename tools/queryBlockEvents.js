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

const { bootNodeApi } = require('../api/websocket');

async function queryBlockEvents(blockId) {
    const api = await bootNodeApi.getApi()

    const blockHash = await api.rpc.chain.getBlockHash(blockId)

    // check all events in the block to find out fee charged
    const events = await api.query.system.events.at(blockHash)
    events.forEach((record) => {
        // extract the phase, event and the event types
        const { event, phase } = record;
        const types = event.typeDef;
        // show what we are busy with
        console.log(event.section + ':' + event.method + '::' + 'phase=' + phase.toString());
        console.log(event.meta.documentation.toString());
        // loop through each of the parameters, displaying the type and data
        event.data.forEach((data, index) => {
            console.log(types[index].type + ';' + data.toString());
        });
    });


}

async function run(){
    await queryBlockEvents(5)
}


run()