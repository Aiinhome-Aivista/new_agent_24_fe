const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'WorkflowDetailPage.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

const apiBlock = lines.slice(394, 713);
fs.writeFileSync(path.join(__dirname, 'api_block.txt'), apiBlock.join('\n'));

const newLines = [...lines.slice(0, 394), ...lines.slice(713)];
fs.writeFileSync(filePath, newLines.join('\n'));

console.log('Successfully extracted API block to api_block.txt and removed it from WorkflowDetailPage.tsx');
