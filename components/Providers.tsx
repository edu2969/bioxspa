'use client';

import { SessionProvider } from 'next-auth/react';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapProvider';

export function Providers({ children, apiKey }: { children: React.ReactNode, apiKey: string }) {
  return (
    <SessionProvider>
      <GoogleMapsProvider apiKey={apiKey}>
        {children}
      </GoogleMapsProvider>
    </SessionProvider>
  );
}