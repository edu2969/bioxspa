import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { USER_ROLE } from "../utils/constants";
import HomeGerencia from "./homeGerencia/page";
import HomeAdministrador from "@/components/HomeAdministrador";
import HomeConductor from "@/components/HomeConductor";
import HomeDespacho from "@/components/HomeDespacho";

export default async function Modulos() {
    const session = await getServerSession(authOptions);
    return (
        <>
            {(session && session.user.role == USER_ROLE.neo) ? <div>yGa</div> : 
                (session && session.user.role == USER_ROLE.manager) ? <HomeGerencia/> : 
                (session && session.user.role == USER_ROLE.conductor) ? <HomeConductor session={session}/> : 
                (session && session.user.role == USER_ROLE.supplier) ? <HomeDespacho session={session}/> 
                : <HomeAdministrador session={session}/>}
        </>
    );
}