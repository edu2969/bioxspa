import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import GestionPedidos from "@/components/GestionPedidos";

export default async function PedidosPage() {
    const session = await getServerSession(authOptions);
    
    return <GestionPedidos session={session}/>;
}