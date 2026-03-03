'use client';

import { GoogleMapsProvider } from '@/components/maps/GoogleMapProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleMapsProvider>
      {children}
    </GoogleMapsProvider>
  );
}