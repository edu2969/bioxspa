"use client";
import { useEffect, useState } from "react";
import {
    GoogleMap,
    Marker
} from "@react-google-maps/api";
import Loader from "../Loader";
import { useGoogleMaps } from "./GoogleMapProvider";

const containerStyle = {
    width: "100%",
    height: "100%",
};

export default function MapWithDraggableMarker({
    lat = -33.45,
    lng = -70.65,
    nombre = "",
    onMarkerChange
}) {
    const [markerPosition, setMarkerPosition] = useState({ lat, lng });
    const { isLoaded } = useGoogleMaps();

    useEffect(() => {
        setMarkerPosition({ lat, lng });
    }, [nombre, lat, lng]);

    const handleMarkerDragEnd = (e) => {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        setMarkerPosition({ lat: newLat, lng: newLng });
        if (onMarkerChange) onMarkerChange({ lat: newLat, lng: newLng });
    };

    return (
        <div className="w-full h-full">
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <Loader texto="Cargando mapa..." />
                </div>
            )}
            {isLoaded && <GoogleMap
                mapContainerStyle={containerStyle}
                center={markerPosition}
                zoom={18}
                onClick={(e) => {
                    const newLat = e.latLng.lat();
                    const newLng = e.latLng.lng();
                    setMarkerPosition({ lat: newLat, lng: newLng });
                    if (onMarkerChange) onMarkerChange({ lat: newLat, lng: newLng });
                }}
            >
                <Marker
                    position={markerPosition}
                    draggable={true}
                    onDragEnd={handleMarkerDragEnd}
                />
            </GoogleMap>}
        </div>
    );
}
