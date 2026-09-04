import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans_SC } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});
const notoSans = Noto_Sans_SC({ variable: '--font-sans-ui', subsets: ['latin'] });

export const metadata: Metadata = {
  title: '卡册金库 · Pokémon 库存估值',
  description: '每日追踪宝可梦卡片的 TCGplayer 市场价，并按单卡 50%、密封产品 80% 估算折算价值。',
  openGraph: {
    title: '卡册金库 · Pokémon 库存估值',
    description: '每日追踪 TCGplayer 市场价；单卡按 50%、密封产品按 80% 估算折算价值。',
  },
  twitter: {
    card: 'summary_large_image',
    title: '卡册金库 · Pokémon 库存估值',
    description: '每日追踪 TCGplayer 市场价；单卡按 50%、密封产品按 80% 估算折算价值。',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
