const fs = require('fs');
const content = fs.readFileSync('tmp/flowchart_out.json', 'utf16le');
// Since it's console.log output, let's just use the original script but parse it and write to utf8.
