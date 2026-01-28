'use client';

import { GoogleMapsProvider } from '@/components/maps/GoogleMapProvider';

export function Providers({ children, apiKey }: { children: React.ReactNode, apiKey: string }) {
  return (
    <GoogleMapsProvider apiKey={apiKey}>
      {children}
    </GoogleMapsProvider>
  );
}