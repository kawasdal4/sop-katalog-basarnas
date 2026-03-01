const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

// Find the start and end of the Reset Password Dialog
let dialogStartIdx = -1;
let dialogEndIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('      {/* Reset Password Dialog */}')) {
        dialogStartIdx = i;
    }
    // The dialog ends exactly before {/* Settings Dialog */}
    if (dialogStartIdx !== -1 && i > dialogStartIdx && lines[i].includes('      {/* Settings Dialog */}')) {
        // The previous line or a few lines before should end the dialog
        // We visually know it ends with </Dialog>
        for (let j = i - 1; j >= dialogStartIdx; j--) {
            if (lines[j].includes('      </Dialog>')) {
                dialogEndIdx = j;
                break;
            }
        }
        break;
    }
}

let resultTxt = "";

if (dialogStartIdx !== -1 && dialogEndIdx !== -1) {
    resultTxt += `Found Dialog block from line ${dialogStartIdx + 1} to ${dialogEndIdx + 1}\n`;

    // Extract the block
    const dialogBlock = lines.slice(dialogStartIdx, dialogEndIdx + 1);

    // Remove the block from its current position
    lines.splice(dialogStartIdx, dialogBlock.length);

    // Find the insertion point
    let insertIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('        {/* Public Content - Optimized Premium Layout (Zero Scrolling) */}')) {
            insertIdx = i;
            break;
        }
    }

    if (insertIdx !== -1) {
        resultTxt += `Inserting Dialog block before line ${insertIdx + 1}\n`;

        // Add some spacing
        dialogBlock.unshift('');
        dialogBlock.push('');

        // Insert the block
        lines.splice(insertIdx, 0, ...dialogBlock);

        // Save back
        fs.writeFileSync(filePath, lines.join('\n'));
        resultTxt += 'Successfully moved the Reset Password Dialog block!';
    } else {
        resultTxt += 'Could not find insertion point.';
    }
} else {
    resultTxt += 'Could not find the Reset Password Dialog block.';
}
console.log(resultTxt);
