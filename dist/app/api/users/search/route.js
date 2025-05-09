"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const user_1 = __importDefault(require("@/models/user"));
async function GET(req) {
    try {
        await (0, mongodb_1.connectMongoDB)();
        const { searchParams } = req.nextUrl;
        const query = searchParams.get('q');
        if (!query) {
            return server_1.NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }
        const users = await user_1.default.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ]
        });
        return server_1.NextResponse.json({ ok: true, users });
    }
    catch (error) {
        console.log("ERROR!", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
