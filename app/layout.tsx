import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '卡册金库 · Pokémon 库存估值',
  description: '每日追踪宝可梦卡片的 TCGplayer 市场价与 80% 现金价值。',
  openGraph: {
    title: '卡册金库 · Pokémon 库存估值',
    description: '每日追踪 TCGplayer 市场价与 80% 现金价值。',
  },
  twitter: {
    card: 'summary_large_image',
    title: '卡册金库 · Pokémon 库存估值',
    description: '每日追踪 TCGplayer 市场价与 80% 现金价值。',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
