const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  let newContent = content.replace(/className="([^"]*?)text-white([^"]*?)"([\s\S]{0,100}?)style=\{\{\s*backgroundColor:\s*'var\(--accent\)'/g, 'className="-[color:var(--accent-fg)]"={{ backgroundColor: \'var(--accent)\'');
  
  newContent = newContent.replace(/style=\{\{\s*backgroundColor:\s*'var\(--accent\)'[\s\S]{0,100}?className="([^"]*?)text-white([^"]*?)"/g, 'style={{ backgroundColor: \'var(--accent)\' }}="-[color:var(--accent-fg)]"');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Updated multi-line in ' + file);
  }
});
