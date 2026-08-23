const fs = require('fs');
let code = fs.readFileSync('D:/Programs/GDVNC/src/components/Sidebar.tsx', 'utf8');
code = code.replace(/H[^\"]+\"p th[^&]+& Th[^\"]+\"o/g, 'Hộp thư và Thông báo'); // Regex to match the garbage
code = code.replace(/aria-label=\"H[^\"]+\"p/g, 'aria-label="Hộp');
code = code.replace(/title=\"H[^\"]+\"p/g, 'title="Hộp');

// More robust regex
code = code.replace(/aria-label="[^"]+"/g, 'aria-label="Inbox"');
code = code.replace(/title="[^"]+"/g, 'title="Inbox"');

fs.writeFileSync('D:/Programs/GDVNC/src/components/Sidebar.tsx', code, 'utf8');

let demonCode = fs.readFileSync('D:/Programs/GDVNC/src/app/demons/page.tsx', 'utf8');
demonCode = demonCode.replace(/@\/components\/LanguageProvider/g, '@/components/LanguageContext');
fs.writeFileSync('D:/Programs/GDVNC/src/app/demons/page.tsx', demonCode, 'utf8');
console.log('Fixed Sidebar and demons/page.tsx');
