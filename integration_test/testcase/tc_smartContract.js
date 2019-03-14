
"use strict";

const assert = require('assert')
const {bootNodeApi} = require('../../api/websocket')
const node = require('../../api/node')
const fs = require('fs');

const contractFilePath = __dirname + '/../../dependency/spin2win.wasm'
const contractHash = '0xef55f2f51f83c5dea3dd0ba33f654d00ca3f62e93929e4c0225e396c310fd1b3'
const issuerSeed = 'Bob'
const gasLimit = 10000
const endowment = 1001

describe('Smart Contract test suite:', function () {
    
    it('Put a smart contract code (Spin2Win) onto chain', async function() {
        this.timeout(60000)

        let _contractHash= ''

        // put the contract onto chain
        const result = await putCode(issuerSeed, gasLimit, contractFilePath)
        assert( result.bSucc == true, `putCode() for smart contract failed.[MSG : ${result.message}]`)
        // get the contract hash
        result.events.forEach(({ phase, event: { data, method, section } }) => {
            if (method == 'CodeStored'){
                _contractHash = data[0].toString()   // data is an array
            }
        });
        assert( _contractHash == contractHash, `Contract hash is not correct.[Expected: ${contractHash}, Actual: ${_contractHash}]`)

        // init contract
        

    });

    it('Initialize the deplyed contract using create()', async function() {
        this.timeout(60000)

        // init contract
        const result = await createContract(issuerSeed, endowment, gasLimit, contractHash)
        // result.events.forEach(({ phase, event: { data, method, section } }) => {
        //     console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
        // });
        assert( result.bSucc == true, `Create() for smart contract failed.[MSG : ${result.message}]`)

    });

});

async function putCode(issuerSeed, gasLimit, contractFilePath, nodeApi = bootNodeApi){ 
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

async function createContract(issuerSeed, endowment, gasLimit, contractHash, nodeApi = bootNodeApi){ 
    // get api
    const api = await nodeApi.getApi()
    
    // make tranction
    const trans = api.tx.contract.create(endowment, gasLimit, contractHash, '0x')

    // sign and send tx
    const txResult = await node.signAndSendTx(trans, issuerSeed)

    return txResult
}