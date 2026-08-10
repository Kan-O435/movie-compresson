import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Discord Video Compressor",
  description: "動画をDiscordへ送信できるサイズまで圧縮します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
