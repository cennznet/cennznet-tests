

module.exports.CURRENCY = {
    STAKE:  0,
    SPEND:  10,
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
        address: '5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ',
        workFolder: '/tmp',
    },
    bob: {
        containerName: 'integration_test_node_1',
        htmlPort: '30334',
        wsPort: '9945',
        seed: 'Bob',
        address: '5Gw3s7q4QLkSWwknsiPtjujPv3XM4Trxi5d4PgKMMk3gfGTE',
        workFolder: '/tmp',
    },
    james: {
        containerName: 'integration_test_node_2',
        htmlPort: '30335',
        wsPort: '9946',
        seed: 'James',
        address: '5GcKi8sUm91QpzaVn3zpD8HkUNT7vEF1HgyAW1t9X1ke7afj',
        workFolder: '/tmp',
    },
    eve: {
        containerName: 'integration_test_node_3',
        htmlPort: '30336',
        wsPort: '9947',
        seed: 'Eve',
        address: '5CNLHq4doqBbrrxLCxAakEgaEvef5tjSrN7QqJwcWzNd7W7k',
        workFolder: '/tmp',
    }
}

module.exports.chainDataFolder = this.validatorNode.alice.workFolder + '/node_data'