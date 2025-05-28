import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import HomeConductor from "@/components/HomeConductor";

export default async function PedidosPage() {
    const session = await getServerSession(authOptions);
    
    return <HomeConductor session={session}/>;
}
