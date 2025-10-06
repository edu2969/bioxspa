import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import Conductor from "@/components/Conductor";

export default async function ConductorPage() {
    const session = await getServerSession(authOptions);
    return <Conductor session={session}/>;
}