"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import {
    GoogleMap,
    Marker,
    InfoWindow,
    useJsApiLoader,
} from "@react-google-maps/api";
import { GrOverview } from "react-icons/gr";

const REGION_BIOBIO_BOUNDS = {
    north: -36.0,
    south: -38.0,
    west: -74.0,
    east: -71.5,
};

const MAP_CONTAINER_STYLE = {
    width: "100%",
    height: "100%",
    minHeight: "400px",
    position: "absolute",
    top: 0,
    left: 0,
};

const MAP_OPTIONS = {
    mapTypeId: "roadmap",
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeControl: false,
};

export default function MapaCilindros({ data }) {
    const [zoomedCluster, setZoomedCluster] = useState(null);
    const [selectedCilindro, setSelectedCilindro] = useState(null);
    const mapRef = useRef(null);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: "AIzaSyCAc2Q7xNTfIejRrrfhpdMI2-8Vel7kjHU",
        language: "es",
    });

    const handleClusterClick = (cluster) => {
        setZoomedCluster(cluster);
        setSelectedCilindro(cluster); // Selecciona el primer cilindro del cluster
    };

    const handleBack = () => {
        setZoomedCluster(null);
        setSelectedCilindro(null);
    };

    // Calcula bounds correctamente
    const getBounds = useCallback(() => {
        const bounds = new window.google.maps.LatLngBounds();
        if (!zoomedCluster) {
            bounds.extend({ lat: REGION_BIOBIO_BOUNDS.north, lng: REGION_BIOBIO_BOUNDS.west });
            bounds.extend({ lat: REGION_BIOBIO_BOUNDS.south, lng: REGION_BIOBIO_BOUNDS.east });
        } else {
            // Solo centra y hace zoom en el punto del cluster, ignora cilindros
            const center = {
                lat: zoomedCluster.direccionId.latitud,
                lng: zoomedCluster.direccionId.longitud
            };       
            bounds.extend(center);
            // Padding para que no quede demasiado cerca
            const range = 0.0001; // Ajusta este valor para más o menos padding
            bounds.extend({
                lat: center.lat - range,
                lng: center.lng - range,
            });
            bounds.extend({
                lat: center.lat + range,
                lng: center.lng - range,
            });
            bounds.extend({
                lat: center.lat + range,
                lng: center.lng + range,
            });
            bounds.extend({
                lat: center.lat - range,
                lng: center.lng + range,
            });
        }
        return bounds;
    }, [zoomedCluster]);

    // Ajusta bounds solo cuando cambia el cluster
    useEffect(() => {
        if (!isLoaded || !mapRef.current) return;
        console.log("Ajustando bounds del mapa", new Date());
        const map = mapRef.current;
        const bounds = getBounds();
        map.fitBounds(bounds, zoomedCluster ? 80 : 2);
    }, [getBounds, zoomedCluster, isLoaded, mapRef]);

    if (loadError)
        return (
            <div className="w-full h-full flex items-center justify-center">
                Error cargando el mapa
            </div>
        );

    return (
        <div className="w-full h-full relative" style={{ minHeight: 400 }}>
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <span className="text-lg font-bold">Cargando mapa...</span>
                </div>
            )}
            {isLoaded && (
                <>
                    <GoogleMap
                        mapContainerStyle={MAP_CONTAINER_STYLE}
                        options={MAP_OPTIONS}
                        zoom={8}
                        center={
                            !zoomedCluster
                                ? { lat: -37.0, lng: -72.7 }
                                : zoomedCluster.center
                        }
                        onLoad={(map) => {
                            mapRef.current = map;
                            const bounds = getBounds();
                            map.fitBounds(bounds, zoomedCluster ? 80 : 0);
                        }}
                    >
                        {!zoomedCluster && data 
                            && data.map((cliente) => (
                                <Marker
                                    key={cliente._id}
                                    position={{ lat: cliente.direccionId.latitud, lng: cliente.direccionId.longitud }}
                                    label={{
                                        text: cliente.llenos.toString(),
                                        color: "#FFF",
                                        fontWeight: "bold",
                                    }}
                                    icon={
                                        isLoaded && window.google && window.google.maps
                                            ? {
                                                url: `https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m${cliente.llenos > 50 ? 5 : Math.floor(cliente.llenos / 10) + 1}.png`,
                                                scaledSize: new window.google.maps.Size(40, 40),
                                            }
                                            : undefined
                                    }
                                    onClick={() => handleClusterClick(cliente)}
                                />
                            ))}
                        {zoomedCluster &&
                            Array.from({ length: 100 }, (_, i) => i + 1).map((cil) => (
                                <Marker
                                    key={`cilindro_${cil}`}
                                    position={{ 
                                        lat: zoomedCluster.direccionId.latitud + 0.000005 * (Math.floor(cil / 10) % 10), 
                                        lng: zoomedCluster.direccionId.longitud + 0.000015 * (cil % 10) + 0.000005 * (Math.floor(cil / 10) % 10)
                                    }}
                                    icon={
                                        isLoaded && window.google && window.google.maps
                                            ? {
                                                url: "./ui/tanque_biox.png",
                                                scaledSize: new window.google.maps.Size(10, 40),
                                            }
                                            : undefined
                                    }
                                    onClick={() => setSelectedCilindro(cil)}
                                />
                            ))}
                        {selectedCilindro && (
                            <InfoWindow
                                position={{
                                    lat: selectedCilindro.direccionId.latitud + 0.00004,
                                    lng: selectedCilindro.direccionId.longitud, // Ajuste para que no se superponga con el marcador
                                }}
                                onCloseClick={() => setSelectedCilindro(null)}
                            >
                                <div>
                                    <b>{selectedCilindro.clienteId.nombre}</b>
                                    <br />
                                    <span>{selectedCilindro.direccionId.nombre}</span>
                                    <ul>
                                        {zoomedCluster.categorias.map((cat, idx) => (
                                            <li key={`categ_${idx}`}><b>{cat.llenos}</b>x {cat.categoriaCatalogoId.nombre}</li>
                                        ))}
                                    </ul>
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>
                    {zoomedCluster && (
                        <div
                            style={{
                                position: "absolute",
                                top: 16,
                                left: 16,
                                zIndex: 10,
                            }}
                        >
                            <button
                                style={{
                                    background: "#2563eb",
                                    color: "#fff",
                                    border: "none",
                                    padding: "8px 18px",
                                    borderRadius: "6px",
                                    fontWeight: "bold",
                                    boxShadow: "0 2px 8px #0002",
                                    cursor: "pointer",
                                }}
                                className="flex items-center gap-2"
                                onClick={handleBack}
                            >
                                <GrOverview/> 
                                Vista panorámica
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
