import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Pedidos from "@/components/Pedidos";

export default async function PedidosPage() {
    const session = await getServerSession(authOptions);
    
    return <Pedidos session={session}/>;
}