'use client'; // si estás usando Next.js App Router

import { useJsApiLoader } from '@react-google-maps/api';
import React, { createContext, useContext } from 'react';

const GoogleMapsContext = createContext<{ isLoaded: boolean }>({ isLoaded: false });

const GOOGLE_MAPS_LIBRARIES: (
  | 'places'
  | 'geometry'
  | 'drawing'
  | 'visualization'
  | 'maps'
)[] = ['maps', 'places'];

export function GoogleMapsProvider({ children, apiKey }: { children: React.ReactNode, apiKey: string }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: 'es',
    region: 'CL',
    version: 'weekly',
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export const useGoogleMaps = () => useContext(GoogleMapsContext);