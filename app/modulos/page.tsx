import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Home from "@/components/Home";

export default async function HomePage() {
    const session = await getServerSession(authOptions);
    return (
        <Home session={session}/>
    );
}