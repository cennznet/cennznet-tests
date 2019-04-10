

const fs = require('fs');

const recordFilePrefix = (new Date()).toJSON();
const fileName = recordFilePrefix + ' - test_records';

module.exports.logRecord = function(str){

    fs.appendFile(`node_log/${fileName}`, `${str}\n`,  (err)=> {
        if(err) console.log(err.message);
    });

    // fs.appendFile(`result/latestResult`, `${str}\n`,  (err)=> {
    //     if(err) console.log(err.message);
    // });
}