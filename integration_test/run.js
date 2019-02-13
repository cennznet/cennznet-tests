
const rimraf = require("rimraf")
const node = require('../api/node')
// const {bootNodeApi} = require('../api/websocket')
const {sleep, loadTestCase} = require('../api/util')

describe('Cennznet node test cases...', function () {
    
    before(async function(){
        this.timeout(60000)
        
        console.log('Start a boot node...')
        // remove older containers
        node.removeNodeContainers()
        // remove old chain data
        rimraf.sync(node.chainDataFolder)
        // start boot node
        await node.startBootNode()

        // wait the node standing up
        await sleep(5000)
    })

    after(function(){
        this.timeout(60000)

        // remove all containers
        console.log('Stop nodes and remove all containers...')
        node.removeNodeContainers()
        // remove chain data
        rimraf.sync(node.chainDataFolder)
        // process.exit()
    })
    
    // first test case: start up bootnode
    require('./testcase/bootNode')

    // load and run all normal testcases
    loadTestCase(__dirname + '/testcase')

    // last test case: check if 50 blocks reached
    require('./testcase/lastCase')
});
