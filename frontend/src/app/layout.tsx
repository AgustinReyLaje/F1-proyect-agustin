import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import { SeasonProvider } from '@/contexts/SeasonContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'F1 Analytics Platform – Formula 1 Data & Predictions',
  description: 'Advanced Formula 1 data analytics, real-time championship standings, and AI-powered race predictions',
  keywords: ['Formula 1', 'F1', 'Analytics', 'Racing', 'Statistics', 'Predictions', '2026'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white`}>
        <SeasonProvider>
          <div className="min-h-screen bg-gray-950">
            <Navbar />
            {children}
          </div>
        </SeasonProvider>
      </body>
    </html>
  );
}
