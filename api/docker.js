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

const block = require('./block')
const util = require('./util')
const { cennznetNode } = require('./definition')
const node = require('./websocket')
const shell = require('shelljs');

const ciImageName = 'integration_test'
var bootNodeIp = ''

module.exports.getRunContainer = function(image){
    let result = shell.exec(`docker ps --format '{{.Names}}' --filter ancestor=${image}`,
                            { silent: true },
                            { async: false})
    return result.stdout.toString().replace('\n', '')
}

module.exports.removeNodeContainers = function(){
    for(let key in cennznetNode){
        let cmd = `docker rm -f $(docker ps -a -q --filter name=${cennznetNode[key].containerName})`
        // console.log('cmd =', cmd)
        let result = shell.exec(cmd, { silent: true }, { async: false}) 
        // console.log('result =', result.code)
    }
}

module.exports.startBootNode = async function(validator = cennznetNode.alice) {
    
    let linkStr = ''

    // check if there is a integration_test container running
    const ciContainerName = this.getRunContainer(ciImageName)
    if (ciContainerName.length > 0 ){
        // find container running
        linkStr = `--link ${ciContainerName}`
    }

    const cmd = `docker run --net bridge --rm --name ${validator.containerName} ${linkStr} ` +
                `-v ${validator.workFolder}:${validator.workFolder} ` +
                `-p ${validator.wsPort}:${validator.wsPort} ` +
                `cennznet-node --base-path ${validator.workFolder}/node_data/${validator.nodeName} ` +
                `--chain ${validator.workFolder}/nodeConfig.json ` +
                `--node-key ${validator.nodeKey} ` +
                `--node-key-type secp256k1 ` +
                `--port ${validator.htmlPort} ` +
                `--key ${validator.rawSeed} ` +
                `--name ${validator.nodeName} ` +
                `--validator ` +
                `--ws-external ` +
                `--ws-port ${validator.wsPort}`

    // console.log(cmd)

    shell.exec( cmd,
                { silent: true },
                function (code, stdout, stderr) {
                    // console.log('Shell CMD exit code:', code);
                    // console.log('Shell CMD output:', stdout);
                    // console.log('Shell CMD stderr:', stderr);
                });
            
    // get the ws ip of node
    if (ciContainerName.length > 0) {
        // find container running, reset the wsIp. Only used when test running in docker image.
        bootNodeIp = ''
        for ( let i = 0; i < 60; i++ ){
            bootNodeIp = this.getBootNodeIp()
            if ( bootNodeIp != '' ){
                break
            }
            await util.sleep(1000)
        }

        if (bootNodeIp == ''){
            throw new Error('Cannot get boot node ip')
        }
        
        // console.log('wsIp =',wsIp)
        node.bootNodeApi.setWsIp(`ws://${bootNodeIp}:9944`)
    }

    // TODO: set config to save log into file

    // wait for 2 blocks to ensure the node start working
    block.waitBlockCnt(2)

}

module.exports.startNewNode = function(validator) {
    const containerName = validator.containerName
    const nodeName = validator.nodeName
    const htmlPort = validator.htmlPort
    const wsPort = validator.wsPort
    const workFolder = validator.workFolder
    const nodeKey = validator.nodeKey
    const rawSeed = validator.rawSeed

    // run a validator node in the same container.
    const _bootNodeIp = this.getBootNodeIp()

    const cmd = `docker run --net bridge --rm --name ${containerName} ` + 
                `-v ${workFolder}:${workFolder} ` + 
                `-p ${wsPort}:${wsPort} ` + 
                `cennznet-node --base-path ${workFolder}/node_data/${nodeName} ` + 
                `--chain ${workFolder}/nodeConfig.json ` + 
                `--node-key ${nodeKey} ` + 
                `--node-key-type secp256k1 ` + 
                `--bootnodes /ip4/${_bootNodeIp}/tcp/30333/p2p/QmQZ8TjTqeDj3ciwr93EJ95hxfDsb9pEYDizUAbWpigtQN ` + 
                `--port ${htmlPort} ` + 
                `--key ${rawSeed} ` + 
                `--name ${nodeName} ` + 
                `--validator ` + 
                `--ws-external ` + 
                `--ws-port ${wsPort}`

    // console.log(cmd)

    shell.exec( cmd,
                { silent: true }, 
                function (code, stdout, stderr) {
                    // console.log('Shell CMD exit code:', code);
                    // console.log('Shell CMD output:', stdout);
                    // console.log('Shell CMD stderr:', stderr);
                });
}

module.exports.dropNodeByContainerName = function(containerName) {

    const cmd = `docker stop ${containerName}`

    shell.exec( cmd,
                { silent: true }, 
                function (code, stdout, stderr) {
                    // console.log('Shell CMD exit code:', code);
                    // console.log('Shell CMD output:', stdout);
                    // console.log('Shell CMD stderr:', stderr);
                });
}

module.exports.getBootNodeIp = function(){

    const wsIp = shell.exec(`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${cennznetNode.alice.containerName}`,
                            { silent: true },
                            { async: false } )
    
    return wsIp.stdout.toString().replace('\n', '')
}

module.exports.queryNodeContainer = function(containerName){
    // query the exact container
    const cmd = `docker ps -q --filter name=^/${containerName}$`

    const result = shell.exec( cmd,
                    { silent: true }, 
                    { async: false});

    return result.stdout.toString().replace('\n', '')
}