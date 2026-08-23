const fs = require('fs');
let content = fs.readFileSync('src/app/api/support/points/route.ts', 'utf8');
content = content.replace("const isSuperAdmin = user.role === 'ADMIN' || user.username === 'iNeQaH';", "");
content = content.replace(/(if \(!user\) \{[\s\S]*?\})/, "\n\n    const isSuperAdmin = user.role === 'ADMIN' || user.username === 'iNeQaH';");
fs.writeFileSync('src/app/api/support/points/route.ts', content);
