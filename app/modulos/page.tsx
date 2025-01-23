import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import HomeNeo from "./homeneo/page";
import { USER_ROLE } from "../utils/constants";
import HomeGerencia from "./homeGerencia/page";

export default async function Modulos() {
    const session = await getServerSession(authOptions);
    console.log("SESSION", session);
    return (
        <>
            {(session && session.user.role == USER_ROLE.neo) ? <HomeNeo /> : <HomeGerencia/>}
        </>
    );
}