"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const user_1 = __importDefault(require("@/models/user"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function GET() {
    try {
        console.log("getAll USERS...");
        await (0, mongodb_1.connectMongoDB)();
        const users = await user_1.default.find();
        return server_1.NextResponse.json({ users });
    }
    catch (error) {
        console.log(error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
async function POST(req) {
    try {
        await (0, mongodb_1.connectMongoDB)();
        const params = await req.json();
        console.log("Users POST...", params);
        const exists = await user_1.default.findOne(params._id ? { _id: params.id } : { email: params.email });
        if (exists) {
            console.log("BODY UPDATE", exists._id, body);
            const user = await user_1.default.findByIdAndUpdate(exists._id, body, {
                new: true
            });
            return user ? server_1.NextResponse.json(user) : server_1.NextResponse.json("NOT UPDATED", {
                status: 404,
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        params.password = hashedPassword;
        return server_1.NextResponse.json({
            ok: true,
            id: await user_1.default.create(params)
        });
    }
    catch (error) {
        console.log("ERROR!", error);
        return server_1.NextResponse.json(error.message, {
            status: 404,
        });
    }
}
