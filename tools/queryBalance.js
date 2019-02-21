
const node = require('../api/node');
const { bootNodeApi } = require('../api/websocket');


// const nodeServerWsIp = 'ws://cennznet-node-1.centrality.me:9944';
var address = "";
var assetId = 0;

async function getArgs()
{
    const argv = require('yargs').argv;
    argv.ws ? await bootNodeApi.setWsIp(argv.ws) : await bootNodeApi.setWsIp('ws://127.0.0.1:9944');
    address = argv.a
    argv.i ? assetId = argv.i : assetId = 0
}


async function run() {

    await getArgs()
    let bal = await node.queryFreeBalance(address, assetId)
    console.log('bal =', bal)
    process.exit()
}


run()

/*  run cmd:
    1. local:   
        node tools/queryBalance -a 5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ --ws ws://127.0.0.1:9944
*/

