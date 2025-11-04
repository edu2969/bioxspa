import Asignacion from "@/components/asignacion/Asignacion";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";

export default async function AsignacionPage() {    
    const session = await getServerSession(authOptions);
    return <Asignacion session={session}/>;
}



