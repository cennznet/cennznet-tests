
const rimraf = require("rimraf")
const mlog = require('mocha-logger')
const fs = require('fs')
const docker = require('../api/docker')
const {chainDataFolder} = require('../api/definition')
const {loadTestCase} = require('../api/util')
const {removeNodeContainers} = require('../api/docker')



describe('Cennznet-Node Integration Test', function () {
    
    before(async function(){
        
        mlog.log('Start a boot node...')
        // remove older containers
        removeNodeContainers()
        // remove old chain data
        rimraf.sync(chainDataFolder)
        // copy chain config file into /tmp
        fs.copyFileSync(__dirname + '/../dependency/nodeConfig.json', '/tmp/nodeConfig.json')
        // start boot node
        await docker.startBootNode()
    })

    after(function(){

        // remove all containers
        mlog.log('Stop nodes and remove all containers...')
        removeNodeContainers()
        // remove chain data
        rimraf.sync(chainDataFolder)
    })
    
    // first test case: start up bootnode
    require('./testcase/bootNode')

    // load and run all normal testcases
    loadTestCase(__dirname + '/testcase')

    // last test case: check if 50 blocks reached
    require('./testcase/lastCase')
});

