// components/InputDireccion.tsx
'use client';

import { useEffect, useState } from 'react';
import { useGoogleMaps } from '@/components/providers/GoogleMapProvider';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { IDireccion } from '@/types/direccion';

type Props = {
  onSelect?: (data: IDireccion | null) => void;
  initialAddress: string | null;
};

export default function InputAddressAutocomplete({ onSelect, initialAddress }: Props) {
  const { isLoaded } = useGoogleMaps();
  const { input, setInput, predictions, getPlaceDetails } = usePlacesAutocomplete();

  const [show, setShow] = useState(false);

  const handleSelect = async (p: google.maps.places.AutocompletePrediction) => {
    const data = await getPlaceDetails(p.place_id);
    if (!data) return;
    const result: IDireccion = {      
      id: initialAddress || '',
      direccionCliente: data.direccion.split(',')[0],
      latitud: data.lat,
      longitud: data.lng,
      placeId: p.place_id
    };

    setInput(data.direccion.split(",")[0]);
    onSelect?.(result); 
  };

  useEffect(() => {
    if(initialAddress) {
      console.log("------------------------------------> InicialAddress", initialAddress);
      setInput(initialAddress);
    }
  }, [initialAddress]);

  return (
    <div className="relative">
      <input
        value={input}
        onFocus={() => setShow(true)}       // 👈 aquí activas
        onBlur={() => setShow(false)}       // 👈 opcional (cerrar)
        onChange={(e) => setInput(e.target.value)}
        className="w-full border p-2"
        placeholder="Dirección"
      />

      {isLoaded && show && predictions.length > 0 && (
        <ul className="absolute bg-white border w-full z-10">
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onMouseDown={() => handleSelect(p)} // 👈 importante (evita blur antes del click)
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}