"use client";
import { useEffect, useMemo, useState } from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
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

    const safeCenter = useMemo(() => {
        const safeLat = Number.isFinite(lat) ? lat : -33.45;
        const safeLng = Number.isFinite(lng) ? lng : -70.65;
        return { lat: safeLat, lng: safeLng };
    }, [lat, lng]);

    useEffect(() => {
        setMarkerPosition(safeCenter);
    }, [nombre, safeCenter]);

    const applyPosition = (next) => {
        setMarkerPosition(next);
        if (onMarkerChange) {
            onMarkerChange(next);
        }
    };

    return (
        <div className="w-full h-full">
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <Loader texto="Cargando mapa..." />
                </div>
            )}
            {isLoaded && (
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={markerPosition}
                    zoom={18}
                    onClick={(e) => {
                        if (!e.latLng) return;
                        applyPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                    }}
                >
                    <MarkerF
                        position={markerPosition}
                        draggable
                        onDragEnd={(e) => {
                            if (!e.latLng) return;
                            applyPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                        }}
                    />
                </GoogleMap>
            )}
        </div>
    );
}