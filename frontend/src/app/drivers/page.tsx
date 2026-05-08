'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import DriversPageContent from './DriversPageContent';

export default function DriversPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen">
        <div className="fixed inset-0 z-0 bg-gray-950">
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75" />
        </div>
        <main className="relative z-10 flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-f1-red" />
        </main>
      </div>
    }>
      <DriversPageContent />
    </Suspense>
  );
}
