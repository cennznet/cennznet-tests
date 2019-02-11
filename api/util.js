

function sleep(ms)
{
    if (ms < 0) ms = 0;
    return new Promise(resolve => setTimeout(resolve, ms))
}


// load and run all testcases from 'integraton_test/testcase/' folder
function loadTestCase( testcaseFolderPath ){
    require("fs").readdirSync(testcaseFolderPath).forEach(function(fileName) {
        if ( fileName.substr(0,3) == 'tc_' ){
            require(testcaseFolderPath + '/' + fileName);
        }
    });
}

module.exports.sleep = sleep
module.exports.loadTestCase = loadTestCase