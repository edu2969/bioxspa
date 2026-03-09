'use client'; // si estás usando Next.js App Router

import { useJsApiLoader } from '@react-google-maps/api';
import React, { createContext, useContext, useEffect } from 'react';

const GoogleMapsContext = createContext<{ isLoaded: boolean }>({ isLoaded: false });

const GOOGLE_MAPS_LIBRARIES: (
  | 'places'
  | 'geometry'
  | 'drawing'
  | 'visualization'
  | 'maps'
  | 'marker'
)[] = ['maps', 'places', 'marker'];

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: 'es',
    region: 'CL',
    version: 'weekly',
    mapIds: [process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || ""]
  });

  useEffect(() => {
    if (loadError) {
      console.error('🧰 ERROR!: Error loading Google Maps API: ', loadError);
    }
  }, [loadError]);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export const useGoogleMaps = () => useContext(GoogleMapsContext);