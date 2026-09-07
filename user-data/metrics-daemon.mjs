import fs from 'fs';
import path from 'path';
import os from 'os';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const sql = postgres(process.env.DATABASE_URL || '');
const metricsFile = path.join(__dirname, 'metrics.jsonl');

async function tick() {
  try {
    const dbMetricsRaw = await sql`
      SELECT 
        pg_database_size(current_database()) as db_size,
        numbackends as active_connections,
        blks_read, blks_hit,
        deadlocks
      FROM pg_stat_database 
      WHERE datname = current_database();
    `;
    const dbM = dbMetricsRaw[0] || {};
    
    const tableMetricsRaw = await sql`
      SELECT 
        sum(n_tup_ins) as inserted,
        sum(n_tup_upd) as updated,
        sum(n_tup_del) as deleted
      FROM pg_stat_user_tables;
    `;
    const tM = tableMetricsRaw[0] || {};

    let cacheHitRate = 100;
    const blksRead = Number(dbM.blks_read) || 0;
    const blksHit = Number(dbM.blks_hit) || 0;
    if (blksRead + blksHit > 0) {
      cacheHitRate = (blksHit / (blksRead + blksHit)) * 100;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      cpu: {
        cores: os.cpus().length,
        loadavg: os.loadavg()[0]
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        rss: process.memoryUsage().rss
      },
      database: {
        size: Number(dbM.db_size) || 0,
        connections: Number(dbM.active_connections) || 0,
        cacheHitRate,
        deadlocks: Number(dbM.deadlocks) || 0,
        rows: {
          inserted: Number(tM.inserted) || 0,
          updated: Number(tM.updated) || 0,
          deleted: Number(tM.deleted) || 0,
        }
      }
    };

    fs.appendFileSync(metricsFile, JSON.stringify(payload) + '\n');
  } catch (error) {
    console.error('Metrics daemon error:', error);
  }
}

console.log('Started metrics daemon, writing to', metricsFile);
tick();
setInterval(tick, 60000); // 1 minute
