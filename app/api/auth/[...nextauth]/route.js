import NextAuth from "next-auth";
import { authOptions } from "@/app/utils/authOptions";

export const { GET, POST } = NextAuth(authOptions);