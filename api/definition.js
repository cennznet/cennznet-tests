

module.exports.keypairCryptoType = 'sr25519' // Options: 'sr25519' and 'ed25519'(only for session key setting)

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
module.exports.cennznetNode = {
    alice: {
        containerName: 'integration_test_node',
        htmlPort: '30333',
        wsPort: '9944',
        seed: 'Alice',
        address: '',
        nodeKey: '0000000000000000000000000000000000000000000000000000000000000001',
        workFolder: '/tmp',
    },
    bunny: {
        containerName: 'integration_test_node_1',
        htmlPort: '30334',
        wsPort: '9945',
        seed: 'Bunny',
        address: '',
        nodeKey: '0000000000000000000000000000000000000000000000000000000000000002',
        workFolder: '/tmp',
    },
    monkey: {
        containerName: 'integration_test_node_2',
        htmlPort: '30335',
        wsPort: '9946',
        seed: 'Monkey',
        address: '',
        nodeKey: '0000000000000000000000000000000000000000000000000000000000000003',
        workFolder: '/tmp',
    },
    pig: {
        containerName: 'integration_test_node_3',
        htmlPort: '30336',
        wsPort: '9947',
        seed: 'Pig',
        address: '',
        nodeKey: '0000000000000000000000000000000000000000000000000000000000000004',
        workFolder: '/tmp',
    }
}

module.exports.chainDataFolder = this.cennznetNode.alice.workFolder + '/node_data'

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