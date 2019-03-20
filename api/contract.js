const {bootNodeApi} = require('./websocket')
const node = require('./node')
const fs = require('fs');


module.exports.putCode = async function(issuerSeed, gasLimit, contractFilePath, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()

    // read contract file
    let contractCode = fs.readFileSync(contractFilePath);

    // convert to hex
    contractCode = '0x' + contractCode.toString('hex')
    
    // make tranction
    const trans = api.tx.contract.putCode(gasLimit, contractCode)

    // sign and send tx
    const txResult = await node.signAndSendTx(trans, issuerSeed)

    return txResult
}

module.exports.createContract = async function (issuerSeed, endowment, gasLimit, contractHash, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()
    
    // make tranction
    const trans = api.tx.contract.create(endowment, gasLimit, contractHash, '0x')

    // sign and send tx
    const txResult = await node.signAndSendTx(trans, issuerSeed)

    console.log('events =', txResult.events)

    // txResult.events.forEach(({ phase, event: { data, method, section } }) => {
    //     console.log('phase =', phase)
    //     console.log('event =', event)
    // });

    return txResult
}