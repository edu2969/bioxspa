import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import OperationPanel from "@/components/operation/OperationPanel";

export default async function Operation() {
    const session = await getServerSession(authOptions);
    console.log("SESSION", session);
    return (
        <>
            <OperationPanel session={session}/>
        </>
    );
}