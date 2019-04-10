

const {loadTestCase} = require('../api/util')
const args = require('../api/args')



describe('Remote Test (for Rimu or Kauri)', function () {
    
    // first test case: start up bootnode
    const fileNotRun = [
        'tc_staking.js',
    ]

    // set Rimu ws ip as the default ip
    args.nodeServerWsIp = 'wss://cennznet-node-0.centrality.cloud:9944'

    require('./testcase/bootNode')

    // load and run all normal testcases
    loadTestCase(__dirname + '/testcase', fileNotRun)

    // last test case: check if 50 blocks reached
    require('./testcase/lastCase')
});

