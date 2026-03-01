const fs = require('fs');
const content = fs.readFileSync('tmp/smtp_log.txt', 'utf16le');
console.log("---- LOG DUMP ----");
console.log(content.substring(0, 5000));
console.log("---- END DUMP ----");
