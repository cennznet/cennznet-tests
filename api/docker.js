const shell = require('shelljs');
const block = require('./block')
const util = require('./util')
const {validatorNode} = require('./definition')
const node = require('./websocket')

const ciImageName = 'integration_test'
var bootNodeIp = ''

module.exports.getRunContainer = function(image){
    let result = shell.exec(`docker ps --format '{{.Names}}' --filter ancestor=${image}`,
                            { silent: true },
                            { async: false})
    return result.stdout.toString().replace('\n', '')
}

module.exports.removeNodeContainers = function(){
    for(let key in validatorNode){
        let cmd = `docker rm -f $(docker ps -a -q --filter name=${validatorNode[key].containerName})`
        // console.log('cmd =', cmd)
        let result = shell.exec(cmd, { silent: true }, { async: false}) 
        // console.log('result =', result.code)
    }
}

module.exports.startBootNode = async function(validator = validatorNode.alice) {
    
    let linkStr = ''

    // check if there is a integration_test container running
    const ciContainerName = this.getRunContainer(ciImageName)
    if (ciContainerName.length > 0 ){
        // find container running
        linkStr = `--link ${ciContainerName}`
    }

    const cmd = `docker run --net bridge --rm --name ${validator.containerName} ${linkStr} \
                -v ${validator.workFolder}:${validator.workFolder} \
                -p ${validator.wsPort}:${validator.wsPort} \
                cennznet-node --dev --base-path ${validator.workFolder}/node_data/${validator.seed} \
                --chain ${validator.workFolder}/nodeConfig.json \
                --node-key ${validator.nodeKey} \
                --port ${validator.htmlPort} \
                --key //${validator.seed} \
                --name ${validator.seed} \
                --validator \
                --ws-external \
                --ws-port ${validator.wsPort}`

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

module.exports.startNewValidator = function(validator) {
    const containerName = validator.containerName
    const keySeed = validator.seed
    const htmlPort = validator.htmlPort
    const wsPort = validator.wsPort
    const workFolder = validator.workFolder
    const nodeKey = validator.nodeKey

    // run a validator node in the same container.
    const _bootNodeIp = this.getBootNodeIp()

    const cmd = `docker run --net bridge --rm --name ${containerName} \
                -v ${workFolder}:${workFolder} \
                -p ${wsPort}:${wsPort} \
                cennznet-node --dev --base-path ${workFolder}/node_data/${keySeed} \
                --chain ${workFolder}/nodeConfig.json \
                --node-key ${nodeKey} \
                --bootnodes /ip4/${_bootNodeIp}/tcp/30333/p2p/QmQZ8TjTqeDj3ciwr93EJ95hxfDsb9pEYDizUAbWpigtQN \
                --port ${htmlPort} \
                --key //${keySeed} \
                --name ${keySeed} \
                --validator \
                --ws-external \
                --ws-port ${wsPort}`

    // console.log(cmd)

    shell.exec( cmd,
                { silent: true }, 
                function (code, stdout, stderr) {
                    // console.log('Shell CMD exit code:', code);
                    // console.log('Shell CMD output:', stdout);
                    // console.log('Shell CMD stderr:', stderr);
                });
}

module.exports.dropNode = function(containerName) {

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

    const wsIp = shell.exec(`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${validatorNode.alice.containerName}`,
                            { silent: true },
                            { async: false} )
    
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