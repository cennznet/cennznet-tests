const shell = require('shelljs');
const {validatorNode} = require('./definition')

function getRunContainer(image){
    let result = shell.exec(`docker ps --format '{{.Names}}' --filter ancestor=${image}`,
                            { silent: true },
                            { async: false})
    return result.stdout.toString().replace('\n', '')
}

function removeNodeContainers(){
    for(let key in validatorNode){
        let result = shell.exec(`docker rm -f $(docker ps -a -q --filter name=${validatorNode[key].containerName})`, { silent: true }, { async: false}) 
        // console.log('result =', result.code)
    }
}

module.exports.getRunContainer = getRunContainer
module.exports.removeNodeContainers = removeNodeContainers