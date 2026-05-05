'use client';

import { GoogleMapsProvider } from '@/components/providers/GoogleMapProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleMapsProvider>
      {children}
    </GoogleMapsProvider>
  );
}