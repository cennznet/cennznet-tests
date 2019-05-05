

const {getAddressFromSeed} = require('./node')
const { SimpleKeyring, Wallet } = require('@cennznet/wallet')

module.exports.CURRENCY = {
    STAKE:  16000,
    SPEND:  16001,
}

module.exports.TxResult = class {
    constructor(){
        this.bSucc = false
        this.message = ''
        this.blockHash = ''
        this.txHash = ''
        this.extrinsicIndex = -1
        this.byteLength = 0
        this.txFee = 0
        this.events = []
    }
}

// all nodes
module.exports.validatorNode = {
    alice: {
        containerName: 'integration_test_node',
        htmlPort: '30333',
        wsPort: '9944',
        seed: 'Alice',
        address: '',
        nodeKey: '0000000000000000000000000000000000000000000000000000000000000001',
        workFolder: '/tmp',
    },
    bob: {
        containerName: 'integration_test_node_1',
        htmlPort: '30334',
        wsPort: '9945',
        seed: 'Bob',
        address: '',
        nodeKey: '0000000000000000000000000000000000000000000000000000000000000002',
        workFolder: '/tmp',
    },
    james: {
        containerName: 'integration_test_node_2',
        htmlPort: '30335',
        wsPort: '9946',
        seed: 'James',
        address: '',
        nodeKey: '0000000000000000000000000000000000000000000000000000000000000003',
        workFolder: '/tmp',
    },
    eve: {
        containerName: 'integration_test_node_3',
        htmlPort: '30336',
        wsPort: '9947',
        seed: 'Eve',
        address: '',
        nodeKey: '0000000000000000000000000000000000000000000000000000000000000004',
        workFolder: '/tmp',
    }
}

module.exports.chainDataFolder = this.validatorNode.alice.workFolder + '/node_data'

/**
 * Set 'uri' as String's inner property. This would be easy for Seed to get the value.
 */
Object.defineProperties(String.prototype, {
    // the seed's uri
    'uri': {
        get: function(){
            return '//' + this
        }
    },
})