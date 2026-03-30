import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ACRYL Intelligence Brief',
  description: 'AI 경영정보 뉴스레터 & MCP 인텔리전스 시스템',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
