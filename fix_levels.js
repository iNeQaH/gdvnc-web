const fs = require('fs');
let file = 'src/app/levels/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\/demons/g, '/levels')
                 .replace(/\/api\/demons/g, '/api/levels')
                 .replace(/Demonlist/g, 'Levels List')
                 .replace(/demonlist\./g, 'levelslist.')
                 .replace(/Levels ListPage/g, 'LevelsListPage');

// The toggle replace
content = content.replace(/<div className="flex bg-\[var\(--bg-subtle\)\] border border-\[var\(--border-ui\)\] rounded-xl overflow-hidden p-0\.5">[\s\S]*?<\/div>/g, 
  "<button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} className=\"p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5\" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }} title=\"Toggle View Mode\">{viewMode === 'list' ? <LayoutGrid className=\"w-4 h-4\" /> : <List className=\"w-4 h-4\" />}</button>"
);

// The filters addition
let filterStr = "<button\n" +
"              onClick={() => setIsFilterModalOpen(true)}\n" +
"              className=\"flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ui-subtle hover:bg-black/5 dark:hover:bg-white/5\"\n" +
"            >\n" +
"              <Settings className=\"w-4 h-4\" />\n" +
"              Filters\n" +
"              {(filterModes.length > 0 || filterTiers.length > 0 || filterFaces.length > 0 || filterVN) && (\n" +
"                <span className=\"w-2 h-2 rounded-full bg-red-500 ml-1\"></span>\n" +
"              )}\n" +
"            </button>\n" +
"          </div>\n" +
"          <div className=\"flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide\">\n" +
"            <button onClick={() => setFilterModes(prev => prev.includes('CLASSIC') ? prev.filter(m => m !== 'CLASSIC') : [...prev, 'CLASSIC'])} className={\"px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 \" + (filterModes.includes('CLASSIC') ? \"bg-[var(--accent)] text-[color:var(--accent-fg)] border-[var(--accent)]\" : \"ui-subtle hover:bg-black/5 dark:hover:bg-white/5\")} >Classic</button>\n" +
"            <button onClick={() => setFilterModes(prev => prev.includes('PLATFORMER') ? prev.filter(m => m !== 'PLATFORMER') : [...prev, 'PLATFORMER'])} className={\"px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 \" + (filterModes.includes('PLATFORMER') ? \"bg-[var(--accent)] text-[color:var(--accent-fg)] border-[var(--accent)]\" : \"ui-subtle hover:bg-black/5 dark:hover:bg-white/5\")} >Platformer</button>\n" +
"            <button onClick={() => setFilterVN(!filterVN)} className={\"px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 \" + (filterVN ? \"bg-red-500 text-white border-red-500\" : \"ui-subtle hover:bg-black/5 dark:hover:bg-white/5\")} ><Flag className=\"w-3.5 h-3.5\" /> VN</button>\n" +
"          </div>\n";

content = content.replace(/<button\n\s*onClick=\{\(\) => setIsFilterModalOpen\(true\)\}[\s\S]*?<\/button>\n\s*<\/div>/g, filterStr);

fs.writeFileSync(file, content, 'utf8');
console.log('Done!');
