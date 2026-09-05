
import re

def fix_cron():
    with open('src/jobs/cron.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(r'console\.log\(\[Cron\].*?notifications\.\);', 'console.log([Cron] Purged notifications);', content)
    content = re.sub(r'console\.log\(\[Cron\].*?sheet\.\);', 'console.log([Cron] Purged timeline events);', content)
    with open('src/jobs/cron.ts', 'w', encoding='utf-8') as f:
        f.write(content)

def fix_records():
    with open('src/routes/admin/records.ts', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        if 'notifyWithNote(' in line:
            lines[i] = '            message: Ky luc da xu ly,\n'
            lines[i+1] = ''
            lines[i+2] = ''
            lines[i+3] = ''
        if 'Kỷ Lục Bị Từ Chối' in line:
            lines[i+1] = '          message: Ky luc bi tu choi,\n'
    with open('src/routes/admin/records.ts', 'w', encoding='utf-8') as f:
        f.writelines(lines)

def fix_users():
    with open('src/routes/admin/users.ts', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        if 'gdVerified: true' in line and 'gdUsername: { equals:' in line:
            pass # just context
        if 'Tên GD' in line and 'đã được xác minh cho tài khoản' in line:
            lines[i] = '        return res.status(409).json({ error: Tai khoan da ton tai });\n'
    with open('src/routes/admin/users.ts', 'w', encoding='utf-8') as f:
        f.writelines(lines)

fix_cron()
fix_records()
fix_users()
