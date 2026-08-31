const fs = require('fs');
const path = require('path');

const YT =
  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;

async function main() {
  const all = [];
  let after = 0;
  for (let i = 0; i < 8; i++) {
    const res = await fetch(
      `https://pointercrate.com/api/v2/demons/listed/?limit=100&after=${after}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'GDVNC/1.0 (+https://gdvnc-web.vercel.app)',
        },
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    after = Number(data[data.length - 1].position);
    console.error(`page ${i + 1} n=${all.length} last=${after}`);
    if (after >= 500) break;
  }

  const out = {};
  let withYt = 0;
  let withReq = 0;
  for (const d of all) {
    const id = Number(d.level_id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const raw = String(d.video || '').trim();
    const yt = /^[\w-]{11}$/.test(raw) ? raw : raw.match(YT)?.[1] || null;
    const req = Number(d.requirement);
    out[id] = {
      youtubeId: yt,
      minPercent: Number.isFinite(req) && req >= 1 && req <= 100 ? req : 100,
    };
    if (yt) withYt += 1;
    if (Number.isFinite(req) && req < 100) withReq += 1;
  }

  const dest = path.join(__dirname, '../src/lib/data/pointercrateClassicMedia.json');
  fs.writeFileSync(dest, JSON.stringify(out));
  console.error(`wrote ${Object.keys(out).length} levels yt=${withYt} req<100=${withReq} -> ${dest}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
