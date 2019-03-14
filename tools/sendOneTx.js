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

    let fee = await require('../api/fee').queryTxFee2(result.txHash)
    console.log('fee = ', fee.toString())

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

// module.exports.send = send

/*
// run code:
       node tools/sendOneTx -f Bob -t Rocket -a 1000 --ws ws://127.0.0.1:9944
*/