"use client";

import Pedidos from "@/components/pedidos/Pedidos";
import { GoogleMapsProvider } from "@/components/maps/GoogleMapProvider";

export default function PedidosPage() {
    return (<GoogleMapsProvider>
        <Pedidos />        
    </GoogleMapsProvider>);
}