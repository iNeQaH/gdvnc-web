import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'api');
const files = [];
(function scan(d) {
  for (const name of fs.readdirSync(d)) {
    const p = path.join(d, name);
    if (fs.statSync(p).isDirectory()) scan(p);
    else if (name === 'route.ts') files.push(p);
  }
})(apiRoot);

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  const orig = src;
  src = src.replace(
    /return NextResponse\.json\(\{ error: error\.message \|\| ([^,]+), 500\);/g,
    'return publicApiError(error, $1, 500);'
  );
  src = src.replace(
    /return NextResponse\.json\(\s*\n\s*\{ error: error\.message \|\| ([^,]+), 500\);/g,
    'return publicApiError(error, $1, 500);'
  );
  src = src.replace(
    /return NextResponse\.json\(\{ error: error\.message \|\| ([^,]+) \}, \{ status: 500 \}\);/g,
    'return publicApiError(error, $1, 500);'
  );
  if (src !== orig) {
    if (!src.includes("from '@/lib/apiError'")) {
      src = src.replace(/^import .+;\n/m, (m) => `${m}import { publicApiError } from '@/lib/apiError';\n`);
    }
    fs.writeFileSync(file, src);
    console.log('pass4', path.relative(process.cwd(), file));
  }
}
