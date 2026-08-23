const fs = require('fs');
let content = fs.readFileSync('src/app/api/support/points/route.ts', 'utf8');
const lines = content.split('\n');
lines[41] = lines[41].replace("const isSuperAdmin = user.role === 'ADMIN' || user.username === 'iNeQaH';", "");
lines.splice(23, 0, "    const isSuperAdmin = user.role === 'ADMIN' || user.username === 'iNeQaH';");
fs.writeFileSync('src/app/api/support/points/route.ts', lines.join('\n'));
