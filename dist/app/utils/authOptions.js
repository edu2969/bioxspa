"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authOptions = void 0;
const credentials_1 = __importDefault(require("next-auth/providers/credentials"));
const mongodb_1 = require("@/lib/mongodb");
const user_1 = __importDefault(require("@/models/user"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.authOptions = {
    providers: [
        (0, credentials_1.default)({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const { email, password } = credentials;
                try {
                    await (0, mongodb_1.connectMongoDB)();
                    const user = await user_1.default.findOne({ email });
                    if (!user) {
                        throw new Error("No user found with the given email");
                    }
                    const isValid = await bcryptjs_1.default.compare(password, user.password);
                    if (!isValid) {
                        throw new Error("Invalid password");
                    }
                    return user;
                }
                catch (error) {
                    if (error instanceof Error) {
                        throw new Error(error.message);
                    }
                    else {
                        throw new Error('An unknown error occurred');
                    }
                }
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/auth/signin"
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id;
            session.user.role = token.role;
            return session;
        }
    }
};
