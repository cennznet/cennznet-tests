// require('../src/api/transaction')
const node = require('../api/node')
const { bootNodeApi } = require('../api/websocket');


async function getArgs()
{
    const argv = require('yargs').argv;
    
    argv.ws ? await bootNodeApi.setWsIp(argv.ws) : await bootNodeApi.setWsIp('ws://127.0.0.1:9944');
    fromSeed = argv.f
    toAddr = argv.t
    argv.a ? amount = parseInt(argv.a) : amount = 1000;
    argv.i ? assetId = argv.i : assetId = 0 // default asset is Cennz
}

// test code
async function send(fromSeed, toAddr, amount, asset = assetId) {

    let toAddress = toAddr

    let bal = await node.queryFreeBalance(toAddress);
    console.log('bal before = ', bal.toString())

    let result = await node.transfer(fromSeed, toAddress, amount, asset);
    console.log('result = ', result)

    bal = await node.queryFreeBalance(toAddress);
    console.log('bal after = ', bal.toString())

    process.exit()
}

async function run()
{
    await getArgs()
    send(fromSeed, toAddr, amount)
}

var fromSeed = ""
var toAddr = ""
var amount = ""
var assetId = 0

run()

/*
// run code:
       node tools/sendOneTx -f Bob -t 5E351ovfS6wiWwuXx7W17AApcZkVcAh2GGKs5uPvazDU6ycb -a 10000000000 --ws ws://127.0.0.1:9944
*/