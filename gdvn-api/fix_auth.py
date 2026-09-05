import re; c=open("src/services/auth.ts","r",encoding="utf8").read(); c=c.replace("import { cookies } from 'next/headers';", ""); open("src/services/auth.ts","w",encoding="utf8").write(c)
