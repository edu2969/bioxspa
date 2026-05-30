import Clientes from "@/components/clientes/Clientes";
import { GoogleMapsProvider } from "@/components/providers/GoogleMapProvider";

export default function ClientesPage() {
    return (<GoogleMapsProvider>
    <Clientes/>
</GoogleMapsProvider>);
}