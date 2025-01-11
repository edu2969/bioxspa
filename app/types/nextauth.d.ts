import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface User {
        name: string,
        email: string,
        createdAt: Date,
        role?: number
    }

    interface Session extends DefaultSession {
        user?: User;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        name: string,
        email: string,
        createdAt: Date,
        role?: number
    }
}