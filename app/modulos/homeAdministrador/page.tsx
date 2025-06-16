import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import HomeAdministrador from "@/components/HomeAdministrador";

export default async function HomeAdministradorPage() {
    const session = await getServerSession(authOptions);
    return <HomeAdministrador session={session} />;
}