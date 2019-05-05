const { Api } = require('@cennznet/api');
const { WsProvider } = require('@cennznet/api/polkadot');
const node = require('../api/node')
const GA = require('../api/ga')
const ws = require('../api/websocket')
const BN = require('big-number')

var nodeServerWsIp = "";
var seed = "";
var assetId = 16000

function getArgs()
{
    const argv = require('yargs').argv;
    argv.ws ? nodeServerWsIp = argv.ws : nodeServerWsIp = 'ws://127.0.0.1:9944';
    seed = argv.s
    argv.a ? assetId = argv.a : assetId = 16000
}

async function listenBalChange(seed) {

    let previous = await node.queryFreeBalance(seed, assetId)
    console.log(`${seed} Bal = ${previous}`);

    const api = new ws.WsApi(nodeServerWsIp)
    const ga = await GA.initGA(seed, api)
    await ga.getFreeBalance(assetId, await node.getAddressFromSeed(seed), (current) => {
        if (current == null || current <= 0 ){
            console.log('null or 0 balance, continue...', current.toString())
            return;
        }

        // Only display positive value changes (Since we are pulling `previous` above already,
        // the initial balance change will also be zero)
        if ( current.toString() === previous.toString() ) {
            console.log('Same Bal as before, continue...')
            return;
        }

        previous = current

        console.log(`${seed} Balance changed: Now = ${current.toString()}`);
    });

}


async function test() {

    getArgs()
    await listenBalChange(seed)
}


test()

/*  run cmd:
    1. local:   
        node tools/listenBalChange -s Alice --ws ws://127.0.0.1:9944
    2. remote:  
        node tools/listenBalChange -a 5DnThWP9rpHMe4XRgLpyxaesK91JxsRbL5zDkFb6t4jUUyYU --ws ws://10.1.1.100:9944
*/

