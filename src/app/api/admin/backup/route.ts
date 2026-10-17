import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { publicApiError } from '@/lib/apiError';
import prisma from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(req: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const isDownload = searchParams.get('action') === 'download';

  if (!isDownload) {
    try {
      const [usersCount, levelsCount, recordsCount] = await Promise.all([
        prisma.user.count(),
        prisma.level.count(),
        prisma.record.count(),
      ]);

      let mediaSizeBytes = 0;
      const userDataDir = path.join(process.cwd(), 'user-data');
      if (fs.existsSync(userDataDir)) {
        try {
          const calculateDirSize = (dir: string): number => {
            let total = 0;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                total += calculateDirSize(fullPath);
              } else if (entry.isFile()) {
                total += fs.statSync(fullPath).size;
              }
            }
            return total;
          };
          mediaSizeBytes = calculateDirSize(userDataDir);
        } catch {
          mediaSizeBytes = 0;
        }
      }

      const mediaSizeMb = (mediaSizeBytes / (1024 * 1024)).toFixed(1);

      return NextResponse.json({
        success: true,
        stats: {
          usersCount,
          levelsCount,
          recordsCount,
          dbSizeEst: '~43 MB',
          mediaSize: `${mediaSizeMb} MB`,
        },
      });
    } catch (err: any) {
      return publicApiError(err, 'Lỗi lấy thông tin sao lưu', 500);
    }
  }

  // Action: download full backup archive (.tar.gz)
  try {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const backupTag = `gdvn_backup_${timestamp}`;
    const tmpDir = `/tmp/${backupTag}`;
    const outArchive = `/tmp/${backupTag}.tar.gz`;

    const appDir = process.cwd();

    // Linux shell backup command
    const cmd = [
      `mkdir -p "${tmpDir}"`,
      `su - postgres -c 'pg_dump gdvn | gzip' > "${tmpDir}/database.sql.gz"`,
      `tar -czf "${tmpDir}/userdata.tar.gz" -C "${appDir}" user-data 2>/dev/null || true`,
      `tar -czf "${outArchive}" -C /tmp "${backupTag}"`,
      `rm -rf "${tmpDir}"`,
    ].join(' && ');

    await execAsync(cmd);

    if (!fs.existsSync(outArchive)) {
      return NextResponse.json({ error: 'Không thể tạo file sao lưu.' }, { status: 500 });
    }

    const stat = fs.statSync(outArchive);
    const nodeStream = fs.createReadStream(outArchive);
    nodeStream.on('close', () => {
      try {
        if (fs.existsSync(outArchive)) fs.unlinkSync(outArchive);
      } catch {}
    });

    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
        try {
          if (fs.existsSync(outArchive)) fs.unlinkSync(outArchive);
        } catch {}
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${backupTag}.tar.gz"`,
        'Content-Length': String(stat.size),
      },
    });
  } catch (err: any) {
    return publicApiError(err, 'Lỗi khi xuất file sao lưu hệ thống.', 500);
  }
}
