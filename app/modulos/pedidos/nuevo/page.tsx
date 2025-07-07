import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Pedidos from "@/components/Pedidos";

export default async function PedidosPage() {
    const session = await getServerSession(authOptions);    
    const googleMapsApiKey = process.env.GOOGLE_API_KEY;

    return <Pedidos session={session} googleMapsApiKey={googleMapsApiKey}/>;
}