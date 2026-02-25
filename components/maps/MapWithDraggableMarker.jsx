"use client";
import { useEffect, useRef, useState } from "react";
import { GoogleMap } from "@react-google-maps/api";
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
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        setMarkerPosition({ lat, lng });
    }, [nombre, lat, lng]);

    useEffect(() => {
        if (isLoaded && mapRef.current) {
            const map = mapRef.current;

            if (google?.maps?.marker?.AdvancedMarkerView) {
                if (markerRef.current) {
                    markerRef.current.position = markerPosition;
                } else {
                    markerRef.current = new google.maps.marker.AdvancedMarkerView({
                        position: markerPosition,
                        map,
                        draggable: true,
                    });

                    markerRef.current.addListener("dragend", (event) => {
                        const newLat = event.latLng.lat();
                        const newLng = event.latLng.lng();
                        setMarkerPosition({ lat: newLat, lng: newLng });
                        if (onMarkerChange) onMarkerChange({ lat: newLat, lng: newLng });
                    });
                }
            } else {
                console.error(
                    "AdvancedMarkerView is not available in the current Google Maps API version."
                );
            }
        }
    }, [isLoaded, markerPosition, onMarkerChange]);

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
                    onLoad={(map) => {
                        mapRef.current = map;
                    }}
                    onClick={(e) => {
                        const newLat = e.latLng.lat();
                        const newLng = e.latLng.lng();
                        setMarkerPosition({ lat: newLat, lng: newLng });
                        if (onMarkerChange) onMarkerChange({ lat: newLat, lng: newLng });
                    }}
                />
            )}
        </div>
    );
}