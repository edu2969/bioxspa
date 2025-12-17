import LoginForm from "@/components/LoginForm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/utils/authOptions";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/pages");
  }

  return (
    <>
      <LoginForm />
    </>
  );
}