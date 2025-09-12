import JefaturaDespacho from "@/components/JefaturaDespacho";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";

export default async function Despacho() {
    const session = await getServerSession(authOptions);
    return <JefaturaDespacho session={session}/>;
}