
import re

# Fix leaderboard.ts
with open('src/routes/leaderboard.ts', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('res.json({ success: true, data: cached });', 'res.json({ success: true, leaderboard: cached });')
c = c.replace('res.json({ success: true, data });', 'res.json({ success: true, leaderboard: data });')
with open('src/routes/leaderboard.ts', 'w', encoding='utf-8') as f:
    f.write(c)

# Fix levels.ts
with open('src/routes/levels.ts', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('const limit = parseInt((req.query.limit as string) || \'50\');', 'const limit = parseInt((req.query.limit as string) || \'5000\');')
with open('src/routes/levels.ts', 'w', encoding='utf-8') as f:
    f.write(c)
