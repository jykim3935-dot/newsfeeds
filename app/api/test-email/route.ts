import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/clients/resend';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to');
  if (!to) {
    return NextResponse.json({ usage: '/api/test-email?to=your@email.com' });
  }

  const result = await sendEmail({
    to: [to],
    subject: '[ACRYL Intel] 테스트 이메일',
    html: '<h1>ACRYL Intelligence Brief</h1><p>이 이메일이 보이면 발송 설정이 정상입니다.</p>',
  });

  return NextResponse.json({
    success: result.success,
    to,
    error: result.error || null,
  }, { status: result.success ? 200 : 500 });
}
