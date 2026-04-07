import Pedidos from "@/components/pedidos/Pedidos";
import { GoogleMapsProvider } from "@/components/maps/GoogleMapProvider";

export default async function EditarPedidoPage({ params }: { params: { pedidoId: string } }) {
    const { pedidoId } = await params;
    return (<GoogleMapsProvider>
        <Pedidos pedidoId={pedidoId}/>        
    </GoogleMapsProvider>);
}