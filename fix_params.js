const fs = require('fs'); const path = require('path');
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f === 'route.ts' || f === 'page.tsx') {
      let content = fs.readFileSync(full, 'utf8');
      if (content.includes('params }: { params: {') && !content.includes('Promise<')) {
         content = content.replace(/params }: \{ params: \{ ([^}]+) \}; \}/g, 'params }: { params: Promise<{  }> }');
         fs.writeFileSync(full, content);
      }
    }
  }
}
walk('src/app');

