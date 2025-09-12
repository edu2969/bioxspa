import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import JefaturaDespacho from "@/components/JefaturaDespacho";

export default async function PreparacionDePedidosPage() {
    const session = await getServerSession(authOptions);
    return <JefaturaDespacho session={session}/>;
}