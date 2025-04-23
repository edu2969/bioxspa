import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import PreparacionDePedidos from "@/components/PreparacionDePedidos";

export default async function Despacho() {
    const session = await getServerSession(authOptions);
    
    return <PreparacionDePedidos session={session}/>;
}