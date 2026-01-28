"use client";

import Pedidos from "@/components/pedidos/Pedidos";
import { GoogleMapsProvider } from "@/components/maps/GoogleMapProvider";

export default function PedidosPage() {
    const googleMapsApiKey = process.env.GOOGLE_API_KEY;
    return (<GoogleMapsProvider apiKey={googleMapsApiKey || ""}>
        <Pedidos/>        
    </GoogleMapsProvider>);
}