const fs = require('fs');
let content = fs.readFileSync('restored_page_full.txt', 'utf8');

let startIndex = content.indexOf("1: 'use client';");
if (startIndex !== -1) {
  let sub = content.substring(startIndex);
  let endIndex = sub.indexOf("\n\nCreated At:");
  if (endIndex !== -1) {
    sub = sub.substring(0, endIndex);
  }
  let lines = sub.split('\n');
  let pageLines = [];
  for (let line of lines) {
    let clean = line.replace('\r', '');
    if (/^\d+:/.test(clean)) {
      pageLines.push(clean.replace(/^\d+:\s?/, ''));
    }
  }
  fs.writeFileSync('src/app/levels/page.tsx', pageLines.join('\n'));
  console.log('Restored ' + pageLines.length + ' lines');
} else {
  console.log('Index not found');
}
