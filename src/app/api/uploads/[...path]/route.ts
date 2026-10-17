import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUserDataDir } from '@/lib/localFileStorage';
import { Readable } from 'stream';

function getMimeType(filePath: string, buffer?: Buffer): string {
  if (buffer && buffer.length >= 4) {
    if (buffer.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif';
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  }
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

// Convert Node.js readable stream to Web ReadableStream
function streamToWeb(nodeStream: fs.ReadStream): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: pathArray } = await params;
    if (!pathArray || pathArray.length === 0) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const userDataDir = getUserDataDir();
    const uploadsDir = path.resolve(userDataDir, 'uploads');
    
    // Normalize and resolve the path
    const targetPath = path.resolve(uploadsDir, ...pathArray);

    // Security check: ensure the resolved path stays strictly within the uploads directory
    if (!targetPath.startsWith(uploadsDir + path.sep)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const stat = await fs.promises.stat(targetPath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Read initial bytes to accurately detect mime type even for extensionless files (e.g. UploadThing legacy or GIFs)
    let headerBuf: Buffer | undefined;
    try {
      const fd = await fs.promises.open(targetPath, 'r');
      headerBuf = Buffer.alloc(16);
      await fd.read(headerBuf, 0, 16, 0);
      await fd.close();
    } catch {}

    // Security check: reject potentially dangerous files (XSS vectors)
    const mimeType = getMimeType(targetPath, headerBuf);
    if (mimeType === 'image/svg+xml' || mimeType.includes('html')) {
      return new NextResponse('Forbidden File Type', { status: 403 });
    }

    const stream = fs.createReadStream(targetPath);
    const webStream = streamToWeb(stream);

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': stat.size.toString(),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
