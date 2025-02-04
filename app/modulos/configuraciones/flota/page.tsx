import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import FlotaPanel from "@/components/FlotaPanel";

export default async function FlotaPage() {
    const session = await getServerSession(authOptions);
    console.log("SESSION", session);
    return (
        <>
            <FlotaPanel session={session}/>
        </>
    );
}