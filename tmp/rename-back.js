const fs = require('fs');
const path = require('path');

const oldPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'sop', 'buat', '[id]', 'editor');
const newPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'sop', 'buat', '[id]', 'flowchart');

if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log('Renamed editor back to flowchart successfully.');
} else {
    console.log('Editor folder not found at:', oldPath);
}
