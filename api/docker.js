const shell = require('shelljs');

function getRunContainer(image){
    let result = shell.exec(`docker ps --format '{{.Names}}' --filter ancestor=${image}`,
                            { silent: true },
                            { async: false})
    return result.stdout.toString().replace('\n', '')
}

function removeNodeContainers(){
    // remove all relevant containers 
    shell.exec(`docker rm -f $(docker ps -a -q --filter name=${nodeContainerName})`, { silent: true }, { async: false}) 
}

module.exports.getRunContainer = getRunContainer
module.exports.removeNodeContainers = removeNodeContainers