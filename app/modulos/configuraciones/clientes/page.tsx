import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Clientes from "@/components/clientes/Clientes";

export default async function FlotaPage() {
    const session = await getServerSession(authOptions);
    console.log("SESSION", session);
    return (
        <>
            <Clientes googleMapsApiKey={process.env.GOOGLE_API_KEY} />
        </>
    );
}