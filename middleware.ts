import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Cron: CRON_SECRET
  if (path.startsWith('/api/cron')) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // MCP: MCP_SECRET (optional)
  if (path.startsWith('/api/mcp')) {
    const secret = process.env.MCP_SECRET;
    if (secret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  // Write APIs: ADMIN_API_KEY
  const writePaths = ['/api/pipeline', '/api/sources', '/api/keywords', '/api/recipients'];
  const isWrite = writePaths.some((p) => path.startsWith(p)) &&
    ['POST', 'PATCH', 'DELETE'].includes(req.method);
  if (isWrite && process.env.ADMIN_API_KEY) {
    const key = req.headers.get('x-api-key');
    if (key !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
