import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Pedidos from "@/components/ventas/Pedidos";

export default async function PedidosPage() {
    const session = await getServerSession(authOptions);
    
    return <Pedidos session={session}/>;
}