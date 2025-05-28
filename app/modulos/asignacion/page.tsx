import AsignacionPanel from "@/components/AsignacionPanel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";

export default async function AsignacionPedidos() {    
    const session = await getServerSession(authOptions);
    return <AsignacionPanel session={session}/>;
}



