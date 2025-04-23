import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import AsignacionPanel from "@/components/AsignacionPanel";

export default async function FlotaPage() {
    const session = await getServerSession(authOptions);
    return (
        <>
            <AsignacionPanel session={session}/>
        </>
    );
}