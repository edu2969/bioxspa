import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { USER_ROLE } from "../utils/constants";
import HomeGerencia from "./homeGerencia/page";
import HomeAdministrador from "./homeAdministrador/page";
import HomeDespacho from "./homeDespacho/page";
import HomeConductor from "./homeConductor/page";

export default async function Modulos() {
    const session = await getServerSession(authOptions);
    console.log("SESSION", session);
    return (
        <>
            {(session && session.user.role == USER_ROLE.neo) ? <div>yGa</div> : 
                (session && session.user.role == USER_ROLE.manager) ? <HomeGerencia/> : 
                (session && session.user.role == USER_ROLE.conductor) ? <HomeConductor/> : 
                (session && session.user.role == USER_ROLE.supplier) ? <HomeDespacho/> 
                : <HomeAdministrador/>}
        </>
    );
}