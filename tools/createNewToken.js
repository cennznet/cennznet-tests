// require('../src/api/transaction')
const ga = require('../api/ga')
const { bootNodeApi } = require('../api/websocket');


async function getArgs()
{
    const argv = require('yargs').argv;
    
    argv.ws ? await bootNodeApi.setWsIp(argv.ws) : await bootNodeApi.setWsIp('ws://127.0.0.1:9944');
    issuerSeed = argv.i
    argv.a ? amount = parseInt(argv.a) : amount = 10000;
}

// test code
async function create(seed, amount) {

    let txResult = await ga.createNewToken(seed, amount)

    console.log('assetId = ', txResult.assetId.toString())

    process.exit()
}

async function run()
{
    await getArgs()
    create(issuerSeed, amount)
}

var issuerSeed = ""
var amount = ""

run()

// module.exports.send = send

/*
// run code:
       node tools/createNewToken -i James -a 10000 --ws ws://127.0.0.1:9944
*/