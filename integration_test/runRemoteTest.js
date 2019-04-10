
const rimraf = require("rimraf")
const fs = require('fs')
const docker = require('../api/docker')
const {chainDataFolder} = require('../api/definition')
const {loadTestCase} = require('../api/util')
const {removeNodeContainers} = require('../api/docker')



describe('Remote Test (for Rimu or Kauri)', function () {
    
    // first test case: start up bootnode
    const fileNotRun = [
        'tc_staking.js',
    ]

    require('./testcase/bootNode')

    // load and run all normal testcases
    loadTestCase(__dirname + '/testcase', fileNotRun)

    // last test case: check if 50 blocks reached
    require('./testcase/lastCase')
});

