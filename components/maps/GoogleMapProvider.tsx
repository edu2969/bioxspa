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
)[] = ['maps', 'places'];

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: 'es',
    region: 'CL',
    version: 'weekly',
  });

  useEffect(() => {
    if (!isLoaded) {
      console.warn('Google Maps API is not loaded yet.');
    } else {
      console.log('Google Maps API loaded successfully: ', process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "");
    }
  }, [isLoaded]);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export const useGoogleMaps = () => useContext(GoogleMapsContext);