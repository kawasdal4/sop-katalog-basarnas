const fs = require('fs');
const path = require('path');

const oldPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'sop', 'buat', '[id]', 'flowchart');
const newPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'sop', 'buat', '[id]', 'editor');

if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log('Renamed flowchart to editor successfully.');
} else {
    console.log('Flowchart folder not found at:', oldPath);
    // Check what is there
    const parentPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'sop', 'buat', '[id]');
    if (fs.existsSync(parentPath)) {
        console.log('Items in parent folder:', fs.readdirSync(parentPath));
    } else {
        console.log('Parent folder not found at:', parentPath);
    }
}
