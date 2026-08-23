const fs = require('fs');
let content = fs.readFileSync('restored_page.txt', 'utf8');

let lines = content.split('\n');
let pageLines = [];
let insideFile = false;

for (let line of lines) {
  if (line.includes("1: 'use client';")) {
    insideFile = true;
  }
  if (insideFile) {
    if (/^\d+:/.test(line)) {
      pageLines.push(line.replace(/^\d+:\s?/, ''));
    }
  }
}

fs.writeFileSync('src/app/levels/page.tsx', pageLines.join('\n'));
console.log('Restored ' + pageLines.length + ' lines');
