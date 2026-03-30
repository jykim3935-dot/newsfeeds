import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to');
  if (!to) {
    return NextResponse.json({ usage: '/api/test-email?to=your@email.com' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;

  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });
  }

  // Use onboarding@resend.dev if no verified domain
  const from = senderEmail || 'onboarding@resend.dev';

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: `ACRYL Intel <${from}>`,
      to: [to],
      subject: '[ACRYL Intel] 테스트 이메일',
      html: '<h1>ACRYL Intelligence Brief</h1><p>이 이메일이 보이면 발송 설정이 정상입니다.</p>',
    });

    return NextResponse.json({
      success: true,
      from,
      to,
      resend_response: result,
    });
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number; name?: string };
    return NextResponse.json({
      success: false,
      from,
      to,
      error: {
        message: error.message,
        statusCode: error.statusCode,
        name: error.name,
      },
    }, { status: 500 });
  }
}
