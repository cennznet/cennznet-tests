const fg = require('fast-glob');
const fs = require('fs');
const files = fg.sync([
    'api/*.[j,t]s', 
    'integration_test/*.[j,t]s',
    'tools/*.[j,t]s'
]);
const header = fs.readFileSync(__dirname + '/header.txt', {encoding: 'utf-8'});



for (const sourceFile of files) {
    console.log(sourceFile)
    const content = fs.readFileSync(sourceFile, {encoding: 'utf-8'});

    fs.writeFileSync(sourceFile, header + '\n' + content, {encoding: 'utf-8'});
}
