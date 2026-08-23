const fs = require('fs');
let code = fs.readFileSync('D:/Programs/GDVNC/src/app/admin/page.tsx', 'utf8');
code = code.replace(/useState<'users' \| 'records'>/g, "useState<'users' | 'records' | 'levels'>");
fs.writeFileSync('D:/Programs/GDVNC/src/app/admin/page.tsx', code, 'utf8');

let demonCode = fs.readFileSync('D:/Programs/GDVNC/src/app/demons/page.tsx', 'utf8');
demonCode = demonCode.replace(/t\(\`demonlist\.\$\{tName\.toLowerCase\(\)\}\`\)/g, "t(`demonlist.${tName.toLowerCase()}` as any)");
fs.writeFileSync('D:/Programs/GDVNC/src/app/demons/page.tsx', demonCode, 'utf8');

let supportCode = fs.readFileSync('D:/Programs/GDVNC/src/app/support/page.tsx', 'utf8');
supportCode = supportCode.replace(/'support\.sp_points'/g, "('support.sp_points' as any)");
fs.writeFileSync('D:/Programs/GDVNC/src/app/support/page.tsx', supportCode, 'utf8');

let contextCode = fs.readFileSync('D:/Programs/GDVNC/src/components/LanguageContext.tsx', 'utf8');
contextCode = contextCode.replace(/return dictionary\[key\] \|\| key;/g, "return (dictionary as any)[key] || key;");
fs.writeFileSync('D:/Programs/GDVNC/src/components/LanguageContext.tsx', contextCode, 'utf8');

console.log('Fixed typescript');
