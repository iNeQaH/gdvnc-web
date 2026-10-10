const fs=require('fs');
let c = fs.readFileSync('src/app/profile/[username]/page.tsx', 'utf8');
c = c.replace(
  /\{data\.avatarUrl \? \(\r?\n\s*<img src=\{data\.avatarUrl\} alt="Avatar" className="w-11 h-11 rounded-2xl object-cover" \/>\r?\n\s*\) : \([\s\S]*?<\/div>\r?\n\s*\)\}/,
  '<img src={data.avatarUrl || \'/gdvn-logo.png\'} alt="Avatar" className="w-11 h-11 rounded-2xl object-cover" />'
);
fs.writeFileSync('src/app/profile/[username]/page.tsx', c);
