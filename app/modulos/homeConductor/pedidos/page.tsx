import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import Despacho from "@/components/Despacho";

export default async function PreparacionDePedidosPage() {
    const session = await getServerSession(authOptions);
    return <Despacho session={session}/>;
}