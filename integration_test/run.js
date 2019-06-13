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

const rimraf = require("rimraf")
const mlog = require('mocha-logger')
const fs = require('fs')
const docker = require('../api/docker')
const { chainDataFolder } = require('../api/definition')
const { loadTestCase } = require('../api/util')
const { removeNodeContainers } = require('../api/docker')
const { bootNodeApi } = require('../api/websocket')
const { cryptoWaitReady } = require('@cennznet/util');

describe('Cennznet-Node Integration Test', function () {
    
    before(async function(){
        
        mlog.log('Start a boot node...')
        // remove older containers
        removeNodeContainers()
        // remove old chain data
        rimraf.sync(chainDataFolder)
        // copy chain config file into /tmp
        fs.copyFileSync(__dirname + '/../dependency/nodeConfig.json', '/tmp/nodeConfig.json')
        // start boot node
        await docker.startBootNode()
        // init for simplyKeyring()
        await cryptoWaitReady()
        // init api
        await bootNodeApi.init()
    })

    after(function(){
        // remove all containers
        mlog.log('Stop nodes and remove all containers...')
        removeNodeContainers()
        // remove chain data
        rimraf.sync(chainDataFolder)
    })
    
    // first test case: start up bootnode
    require('./testcase/bootNode')

    // load and run all normal testcases
    loadTestCase(__dirname + '/testcase')

    // last test case: check if 50 blocks reached
    require('./testcase/lastCase')
});

