import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MetaChat',
  description: 'MetaChat',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-[#1F2430] antialiased">{children}</body>
    </html>
  );
}
