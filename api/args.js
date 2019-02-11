


var nodeServerWsIp = ""

function _getArgs()
{
    const argv = require('yargs').argv;
    argv.ws ? nodeServerWsIp = argv.ws : nodeServerWsIp = 'ws://127.0.0.1:9944';
}

_getArgs()

module.exports.nodeServerWsIp = nodeServerWsIp