import { NextResponse } from 'next/server';
import { requireFullAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { publicApiError } from '@/lib/apiError';

export async function GET() {
  try {
    try {
      await requireFullAdmin();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET || '';
    const jwtPassed = jwtSecret.length >= 32;

    // 2. Check TURNSTILE_SECRET_KEY
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '';
    const turnstilePassed = turnstileSecret.length > 0;

    // 3. Check DB
    let dbPassed = false;
    let dbMessage = 'Database is connected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbPassed = true;
    } catch (e: any) {
      dbPassed = false;
      dbMessage = e.message || 'Database connection failed';
    }

    return NextResponse.json({
      jwtSecret: {
        status: jwtPassed ? 'Passed' : 'Failed',
        message: jwtPassed ? 'Valid length' : 'Must be >= 32 characters'
      },
      turnstile: {
        status: turnstilePassed ? 'Passed' : 'Warning',
        message: turnstilePassed ? 'Key is configured' : 'Key is missing'
      },
      database: {
        status: dbPassed ? 'Passed' : 'Failed',
        message: dbMessage
      }
    });
  } catch (error: any) {
    return publicApiError(error);
  }
}
