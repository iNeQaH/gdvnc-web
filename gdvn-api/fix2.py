
def fix_records():
    with open('src/routes/admin/records.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('message: Ky luc bi tu choi,', 'message: Ky luc bi tu choi,')
    with open('src/routes/admin/records.ts', 'w', encoding='utf-8') as f:
        f.write(content)

fix_records()
