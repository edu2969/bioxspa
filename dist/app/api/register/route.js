"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const user_1 = __importDefault(require("@/models/user"));
const server_1 = require("next/server");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function POST(req) {
    try {
        const { name, email, password } = await req.json();
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        console.log("HASTA ACA BIEN...", name, email, password);
        await (0, mongodb_1.connectMongoDB)();
        console.log("PASA...");
        await user_1.default.create({ name, email, password: hashedPassword });
        return server_1.NextResponse.json({ message: "User registered." }, { status: 201 });
    }
    catch (_a) {
        return server_1.NextResponse.json({ message: "An error occurred while registering the user." }, { status: 500 });
    }
}
