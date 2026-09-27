import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'حجز المواعيد',
  description: 'واجهة لحجز المواعيد مع تحديثات لحظية',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      {/* Browser extensions (e.g. ColorZilla) inject attributes into <body> before hydration. */}
      <body className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
