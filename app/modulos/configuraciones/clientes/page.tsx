import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Clientes from "@/components/Clientes";

export default async function FlotaPage() {
    const session = await getServerSession(authOptions);
    console.log("SESSION", session);
    return (
        <>
            <Clientes/>
        </>
    );
}