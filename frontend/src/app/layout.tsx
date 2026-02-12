import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import { SeasonProvider } from '@/contexts/SeasonContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'F1 Analytics Platform',
  description: 'Advanced Formula 1 data analytics and predictions',
  keywords: ['Formula 1', 'F1', 'Analytics', 'Racing', 'Statistics'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SeasonProvider>
          <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <Navbar />
            {children}
          </div>
        </SeasonProvider>
      </body>
    </html>
  );
}
