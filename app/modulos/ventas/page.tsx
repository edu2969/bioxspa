import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Venta from "@/components/ventas/Venta";

export default async function VentasPage() {
    const session = await getServerSession(authOptions);
    
    return <Venta session={session}/>;
}