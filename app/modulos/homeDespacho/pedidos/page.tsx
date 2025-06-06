import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import PreparacionDePedidos from "@/components/PreparacionDePedidos";

export default async function PreparacionDePedidosPage() {
    const session = await getServerSession(authOptions);
    return <PreparacionDePedidos session={session}/>;
}