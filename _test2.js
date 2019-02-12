

const { ApiPromise } = require('@polkadot/api');
const { WsProvider } = require('@polkadot/rpc-provider');
const { Keyring } = require('@polkadot/keyring');
const { stringToU8a } = require('@polkadot/util');

const typeRegistry = require('@polkadot/types/codec/typeRegistry');
typeRegistry.default.register({
    AssetId: 'u32',
    Topic: 'u256', 
    Value: 'u256',
    AssetOptions: { total_supply: 'Balance' }
});

var nodeServerWsIp = "";
var address = "";

function getArgs()
{
    const argv = require('yargs').argv;
    argv.ws ? nodeServerWsIp = argv.ws : nodeServerWsIp = 'ws://127.0.0.1:9944';
    address = argv.a
}

async function listenBalChange(address) {
    // Create an await for the API
    const provider = new WsProvider(nodeServerWsIp);

    const api = await ApiPromise.create(provider);

    let _address = null;

    // Operate different input: seed or address
    if ( address.length == 48 ) {   // address
        _address = address
    }
    else{   // seed
        const seed = address.padEnd(32, ' ');
        const keyring = new Keyring();
        
        const fromAccount = keyring.addFromSeed(stringToU8a(seed));
        // console.log('fromAccount = ', fromAccount)
        _address = fromAccount.address();
    }
    
    // get bal
    let bal = await api.query.balances.freeBalance(_address);

    console.log(`Bal = ${bal}`);

    return bal
}

async function run() {

    getArgs()
    address = 'Bob'
    
    await listenBalChange(address)


    process.exit()
}


run()