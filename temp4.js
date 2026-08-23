const fs = require('fs');
let contextCode = fs.readFileSync('D:/Programs/GDVNC/src/components/LanguageContext.tsx', 'utf8');
contextCode = contextCode.replace(/return dictionary\[key\] \|\| en\[key\] \|\| key;/g, "return (dictionary as any)[key] || (en as any)[key] || key;");
fs.writeFileSync('D:/Programs/GDVNC/src/components/LanguageContext.tsx', contextCode, 'utf8');
