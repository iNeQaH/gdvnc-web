import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'api');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name === 'route.ts' || name.endsWith('/route.ts')) out.push(p);
    else if (p.endsWith(`${path.sep}route.ts`)) out.push(p);
  }
  return out;
}

const files = [];
(function scan(d) {
  for (const name of fs.readdirSync(d)) {
    const p = path.join(d, name);
    if (fs.statSync(p).isDirectory()) scan(p);
    else if (name === 'route.ts') files.push(p);
  }
})(root);

let changed = 0;
for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('error.message') && !src.includes('error?.message')) continue;
  if (src.includes('publicApiError')) {
    // still may have raw leaks
  }
  const orig = src;
  src = src.replace(
    /return NextResponse\.json\(\s*\{\s*error:\s*error\.message\s*\|\|\s*('([^']|')*')\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\);/g,
    'return publicApiError(error, $1, $3);'
  );
  src = src.replace(
    /return NextResponse\.json\(\s*\{\s*error:\s*error\?\.message\s*\|\|\s*('([^']|')*')\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\);/g,
    'return publicApiError(error, $1, $3);'
  );
  src = src.replace(
    /return NextResponse\.json\(\s*\{\s*success:\s*false,\s*error:\s*error\.message\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\);/g,
    'return publicApiError(error, "Internal Server Error", $1);'
  );
  if (src !== orig) {
    if (!src.includes("from '@/lib/apiError'") && !src.includes('from "@/lib/apiError"')) {
      const importLine = "import { publicApiError } from '@/lib/apiError';\n";
      const nextImport = src.match(/^import .+;\n/m);
      if (nextImport) {
        src = src.replace(nextImport[0], nextImport[0] + importLine);
      } else {
        src = importLine + src;
      }
    }
    fs.writeFileSync(file, src);
    changed += 1;
    console.log('fixed', path.relative(process.cwd(), file));
  }
}
console.log('done', changed);
