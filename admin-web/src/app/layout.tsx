import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'لوحة التحكم | تلاوات المسجد الكبير',
  description: 'لوحة إدارة ونشر التسجيلات والخطب والمقاطع المرئية لتطبيق المسجد الكبير',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-pattern">{children}</body>
    </html>
  );
}
