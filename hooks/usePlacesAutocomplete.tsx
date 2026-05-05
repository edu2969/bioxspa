// hooks/usePlacesAutocomplete.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '@/components/providers/GoogleMapProvider';

export function usePlacesAutocomplete() {
  const { isLoaded } = useGoogleMaps();

  const autoService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placeService = useRef<google.maps.places.PlacesService | null>(null);

  const [input, setInput] = useState('');
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);

  useEffect(() => {
    if (!isLoaded) return;

    autoService.current = new google.maps.places.AutocompleteService();

    const div = document.createElement('div');
    placeService.current = new google.maps.places.PlacesService(div);
  }, [isLoaded]);

  useEffect(() => {
    if (!input || input.length < 3 || !autoService.current) {
      setPredictions([]);
      return;
    }

    const t = setTimeout(() => {
      autoService.current!.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: 'cl' },
          types: ['address'],
        },
        (res) => setPredictions(res || [])
      );
    }, 1000);

    return () => clearTimeout(t);
  }, [input]);

  const getPlaceDetails = (placeId: string) =>
    new Promise<{
      direccion: string;
      lat: number;
      lng: number;
    } | null>((resolve) => {
      if (!placeService.current) return resolve(null);

      placeService.current.getDetails(
        {
          placeId,
          fields: ['formatted_address', 'geometry'],
        },
        (place, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            place &&
            place.geometry
          ) {
            resolve({
              direccion: place.formatted_address || '',
              lat: place.geometry.location?.lat() || 0,
              lng: place.geometry.location?.lng() || 0,
            });
          } else {
            resolve(null);
          }
        }
      );
    });

  return {
    input,
    setInput,
    predictions,
    getPlaceDetails,
  };
}