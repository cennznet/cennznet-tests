

// get command line parameter
var argv = require('minimist')(process.argv.slice(2));

var nodeServerWsIp = ''

function _getArgs()
{
    // get ws ip, default is local ip
    argv.ws ? nodeServerWsIp = argv.ws : nodeServerWsIp = 'ws://127.0.0.1:9944'
}

_getArgs()

module.exports.nodeServerWsIp = nodeServerWsIp