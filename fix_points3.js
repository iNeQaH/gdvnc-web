const fs = require('fs');
let content = fs.readFileSync('src/app/api/support/points/route.ts', 'utf8');
content = content.replace(/const isSuperAdmin = .*?;\n\s*/g, '');
const searchStr = if (!user) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy tài khoản.' }, { status: 404 });
    };
const replaceStr = searchStr + \n\n    const isSuperAdmin = user.role === 'ADMIN' || user.username === 'iNeQaH';;
content = content.replace(searchStr, replaceStr);
fs.writeFileSync('src/app/api/support/points/route.ts', content);
