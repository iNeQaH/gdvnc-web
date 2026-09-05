
import re
with open('src/routes/admin/records.ts', 'r', encoding='utf-8') as f:
    c = f.read()
c = re.sub(r'message:\s*Ky luc bi tu choi,', 'message: Ky luc bi tu choi,', c)
with open('src/routes/admin/records.ts', 'w', encoding='utf-8') as f:
    f.write(c)
