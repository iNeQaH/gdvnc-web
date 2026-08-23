const fs = require('fs');
let code = fs.readFileSync('D:/Programs/GDVNC/src/app/admin/page.tsx', 'utf8');

// Add X icon to lucide-react import
code = code.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, X } from 'lucide-react';");

code = code.replace(/const \[managingUser, setManagingUser\] = useState<any \| null>\(null\);/, 
  "const [managingUser, setManagingUser] = useState<any | null>(null);\n  const [levelForm, setLevelForm] = useState({ gdLevelId: '', videoUrl: '', minPercent: '100', basePp: '', placement: '', mode: 'CLASSIC' });\n  const [addingLevel, setAddingLevel] = useState(false);\n  const [levelToast, setLevelToast] = useState({ text: '', isError: false });");

code = code.replace(/<button\s+onClick=\{\(\) => setTab\('users'\)\}[\s\S]*?<\/button>/, (match) => {
  return match + `
            <button
              onClick={() => setTab('levels')}
              className={"px-4 py-2 font-bold text-xs transition-colors " + (tab === 'levels' ? 'border-b-2' : 'ui-dim hover:opacity-100')}
              style={{ borderColor: tab === 'levels' ? 'var(--accent)' : 'transparent', color: tab === 'levels' ? 'var(--text-title)' : undefined }}
            >
              Thêm Màn Chơi
            </button>`;
});

const levelTabContent = `
        {tab === 'levels' && (
          <div className="ui-card p-6 space-y-6">
            <h3 className="font-bold ui-title border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>Thêm/Cập nhật Màn Chơi (Level)</h3>
            
            {levelToast.text && (
              <div className={"p-3 rounded-xl text-xs font-bold " + (levelToast.isError ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500')}>
                {levelToast.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase ui-dim">Geometry Dash Level ID *</label>
                <input 
                  type="number" 
                  value={levelForm.gdLevelId} 
                  onChange={e => setLevelForm({...levelForm, gdLevelId: e.target.value})} 
                  className="w-full ui-input text-xs font-semibold"
                  placeholder="Ví dụ: 10565740"
                />
                <p className="text-[10px] ui-dim">Hệ thống sẽ tự lấy Tên, Tác giả, Độ khó từ máy chủ GD.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase ui-dim">Link Video Showcase (YouTube)</label>
                <input 
                  type="text" 
                  value={levelForm.videoUrl} 
                  onChange={e => setLevelForm({...levelForm, videoUrl: e.target.value})} 
                  className="w-full ui-input text-xs font-semibold"
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase ui-dim">Chế độ (Mode)</label>
                <select 
                  value={levelForm.mode} 
                  onChange={e => setLevelForm({...levelForm, mode: e.target.value})} 
                  className="w-full ui-input text-xs font-semibold"
                >
                  <option value="CLASSIC">Classic (Ngôi sao)</option>
                  <option value="PLATFORMER">Platformer (Mặt trăng)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase ui-dim">Xếp hạng (Placement)</label>
                <input 
                  type="number" 
                  value={levelForm.placement} 
                  onChange={e => setLevelForm({...levelForm, placement: e.target.value})} 
                  className="w-full ui-input text-xs font-semibold"
                  placeholder="Ví dụ: 1 (Top 1)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase ui-dim">Base Points (Điểm cơ bản)</label>
                <input 
                  type="number" 
                  value={levelForm.basePp} 
                  onChange={e => setLevelForm({...levelForm, basePp: e.target.value})} 
                  className="w-full ui-input text-xs font-semibold"
                  placeholder="Ví dụ: 2000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase ui-dim">Tiến độ tối thiểu (%)</label>
                <input 
                  type="number" 
                  value={levelForm.minPercent} 
                  onChange={e => setLevelForm({...levelForm, minPercent: e.target.value})} 
                  className="w-full ui-input text-xs font-semibold"
                  placeholder="Mặc định: 100"
                />
              </div>
            </div>

            <button
              onClick={async () => {
                if (!levelForm.gdLevelId) return setLevelToast({ text: 'Vui lòng nhập Level ID', isError: true });
                setAddingLevel(true);
                try {
                  const res = await fetch('/api/admin/levels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(levelForm)
                  });
                  const data = await res.json();
                  if (data.success) {
                    setLevelToast({ text: "Thêm thành công: " + data.level.name, isError: false });
                    setLevelForm({ gdLevelId: '', videoUrl: '', minPercent: '100', basePp: '', placement: '', mode: 'CLASSIC' });
                  } else {
                    setLevelToast({ text: data.error, isError: true });
                  }
                } catch (e) {
                  setLevelToast({ text: 'Lỗi mạng', isError: true });
                } finally {
                  setAddingLevel(false);
                }
              }}
              disabled={addingLevel}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
              style={{ backgroundColor: 'var(--accent)', opacity: addingLevel ? 0.5 : 1 }}
            >
              {addingLevel ? 'Đang lấy dữ liệu...' : 'Thêm / Cập Nhật Màn Chơi'}
            </button>
          </div>
        )}
`;

code = code.replace(/\{tab === 'users' && \(/, levelTabContent + "\n        {tab === 'users' && (");

const deleteFunctions = `
  const handleDeleteUser = async (id, username) => {
    if (!confirm("BẠN CÓ CHẮC CHẮN MUỐN XÓA USER " + username + "? Toàn bộ kỷ lục sẽ bị xóa vĩnh viễn!")) return;
    try {
      const res = await fetch("/api/admin/users/" + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast("Đã xóa user " + username);
        setManagingUser(null);
        fetchUsers();
      } else {
        showToast(data.error, true);
      }
    } catch (e) {
      showToast('Lỗi mạng', true);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!confirm('Xóa kỷ lục này? Điểm Points sẽ được tính lại tự động.')) return;
    try {
      const res = await fetch("/api/admin/records/" + recordId, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa kỷ lục');
        const updated = await fetch('/api/admin/users').then(r => r.json());
        if (updated.success) {
           setUsers(updated.users);
           const refreshed = updated.users.find(u => u.id === managingUser.id);
           if (refreshed) setManagingUser(refreshed);
        }
      } else {
        showToast(data.error, true);
      }
    } catch (e) {
      showToast('Lỗi mạng', true);
    }
  };
`;

code = code.replace(/const handleUpdateUser = /, deleteFunctions + "\n  const handleUpdateUser = ");

code = code.replace(/\{savingUserChanges \? 'Đang lưu\.\.\.' : 'Lưu Thay Đổi'\}/, (match) => {
  return match + `
              </button>
              <button
                onClick={() => handleDeleteUser(managingUser.id, managingUser.username)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-red-500 text-white shadow-xs hover:opacity-90"
              >
                Xóa Tài Khoản`;
});

const recordsSection = `
            {/* 3. User Records List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold ui-title uppercase tracking-wider flex items-center gap-2">
                3. Danh sách kỷ lục đã nộp ({managingUser.records?.length || 0})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {managingUser.records?.length === 0 ? (
                   <div className="text-[10px] ui-dim italic">Chưa có kỷ lục nào.</div>
                ) : (
                   managingUser.records?.map((rec) => (
                     <div key={rec.id} className="flex items-center justify-between p-2 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                        <div>
                          <div className="text-[11px] font-bold ui-title">{rec.level?.name || 'Unknown Level'}</div>
                          <div className="text-[10px] ui-dim">{rec.progress}% - {rec.status}</div>
                        </div>
                        <button onClick={() => handleDeleteRecord(rec.id)} className="text-red-500 hover:opacity-80 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                     </div>
                   ))
                )}
              </div>
            </div>
`;

code = code.replace(/<\/div>\s*<\/div>\s*\{!isSuperAdmin && currentUser\.id !== managingUser\.id/, recordsSection + "\n          </div>\n        </div>\n        {!isSuperAdmin && currentUser.id !== managingUser.id");

fs.writeFileSync('D:/Programs/GDVNC/src/app/admin/page.tsx', code, 'utf8');
console.log('Admin page updated successfully!');
