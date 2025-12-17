import React, { useRef, useEffect, FC } from 'react';

type PlaceAutocompleteInputProps = {
    handleSelectPlace: (place: google.maps.places.PlaceResult) => void;
};

const PlaceAutocompleteInput: FC<PlaceAutocompleteInputProps> = ({
    handleSelectPlace
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current && window.google) {
            const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
                types: ['geocode', 'establishment'],
                componentRestrictions: { country: 'us' },
            });

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                console.log(place);
                handleSelectPlace(place);
            });
        }
    }, [handleSelectPlace]);

    return <input className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" 
        ref={inputRef} type="text" placeholder="Ingrese una dirección" />;
};

export default PlaceAutocompleteInput;