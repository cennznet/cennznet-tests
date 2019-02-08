

const node = require('../api/bootNode')
// const {bootNodeApi} = require('../api/websocket')
const {sleep, loadTestCase} = require('../api/util')

describe('Start running test cases...', function () {
    
    before(async function(){
        this.timeout(60000)
        // start boot node
        console.log('Start a boot node...')
        node.removeNodeContainers()
        node.startBootNode()

        // wait the node standing up
        await sleep(5000)
    })

    after(function(){
        this.timeout(60000)

        // remove all containers
        console.log('Stop nodes and remove all containers...')
        node.removeNodeContainers()
        // process.exit()
    })
    
    // load and run all testcases from folder
    loadTestCase(__dirname + '/testcase')
});

