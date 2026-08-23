const fs = require('fs');
let code = fs.readFileSync('D:/Programs/GDVNC/src/app/admin/page.tsx', 'utf8');
code = code.replace(/useState<'records' \| 'users'>/g, "useState<'records' | 'users' | 'levels'>");
fs.writeFileSync('D:/Programs/GDVNC/src/app/admin/page.tsx', code, 'utf8');

let contextCode = fs.readFileSync('D:/Programs/GDVNC/src/components/LanguageContext.tsx', 'utf8');
contextCode = contextCode.replace(/return \(dictionary as any\)\[key\] \|\| key;/g, "// @ts-ignore\n    return dictionary[key as keyof typeof dictionary] || key;");
fs.writeFileSync('D:/Programs/GDVNC/src/components/LanguageContext.tsx', contextCode, 'utf8');

console.log('Fixed typescript');
