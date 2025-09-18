import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "政策立案 予算シミュレーション",
  description: "行政改革学生アイデアソン・ハッカソン向けの政策予算分析ツール",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
