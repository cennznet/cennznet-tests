
"use strict";

var shell = require('shelljs');

shell.exec('docker rm -f $(docker ps -a -q --filter ancestor=cennznet-node)') // remove all containers under image 'cennznet-node'
shell.exec('docker run -d --name integration-test-node \
            cennznet-node --dev',
            // {silent:true},
    // function (code , stdout, stderr) {
    //     console.log('Exit code:', code);
    //     console.log('Program output:', stdout);
    //     console.log('Program stderr:', stderr);
    // }
    );

console.log(123)