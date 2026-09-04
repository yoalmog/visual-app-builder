import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Apex Studio — Visual App Builder',
  description: 'Production-grade visual IDE for building modern applications with data and workflows.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07080B] text-slate-100 antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
