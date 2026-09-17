import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src/lib');
const lines = fs.readFileSync(path.join(root, 'dictionaries.ts'), 'utf8').split(/\r?\n/);
const enLines = lines.slice(0, 732);
const viLines = lines.slice(735);
const dictDir = path.join(root, 'dictionaries');
fs.mkdirSync(dictDir, { recursive: true });

const enBody = enLines.join('\n').replace(/^export const en = /, 'const en = ');
fs.writeFileSync(path.join(dictDir, 'en.ts'), `${enBody}\nexport default en;\n`);

const viBody = viLines
  .join('\n')
  .replace(
    /^export const vi: Record<DictKey, string> = /,
    "import type { DictKey } from './keys';\n\nconst vi: Record<DictKey, string> = "
  );
fs.writeFileSync(path.join(dictDir, 'vi.ts'), `${viBody}\nexport default vi;\n`);

console.log('split ok');
